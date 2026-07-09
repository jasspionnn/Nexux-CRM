// Shared by the leads, webhooks, and scoring route modules — recalculates a
// lead's profile/interest score. Kept out of any single domain module because
// all three call it directly.
export async function calculateLeadScore(db: any, account_id: string, leadId?: string) {
  try {
    // Get leads
    let leads: any[] = [];
    if (leadId) {
      const lead = await db.prepare('SELECT * FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
      if (lead) leads = [lead];
    } else {
      const { results } = await db.prepare('SELECT * FROM leads WHERE account_id = ?').bind(account_id).all();
      leads = results || [];
    }

    if (leads.length === 0) return { success: true, count: 0 };

    // Get all active profile rules with fields
    const { results: profileRules } = await db.prepare(
      'SELECT * FROM scoring_profile_rules WHERE account_id = ? AND is_active = 1'
    ).bind(account_id).all();

    const profileFieldsByRule: any = {};
    for (const rule of profileRules || []) {
      const { results: fields } = await db.prepare(
        'SELECT * FROM scoring_profile_fields WHERE rule_id = ?'
      ).bind(rule.id).all();
      profileFieldsByRule[rule.id] = fields || [];
    }

    // Get all active interest rules with conversions
    const { results: interestRules } = await db.prepare(
      'SELECT * FROM scoring_interest_rules WHERE account_id = ? AND is_active = 1'
    ).bind(account_id).all();

    const interestConversionsByRule: any = {};
    for (const rule of interestRules || []) {
      const { results: conversions } = await db.prepare(
        'SELECT * FROM scoring_interest_conversions WHERE rule_id = ?'
      ).bind(rule.id).all();
      interestConversionsByRule[rule.id] = conversions || [];
    }

    // Calculate scores for each lead
    for (const lead of leads) {
      let profileScore = 0;
      let interestScore = 0;

      // 1. Calculate profile score
      const customValues: any = lead.custom_values ? JSON.parse(lead.custom_values) : {};

      for (const ruleId in profileFieldsByRule) {
        const fields = profileFieldsByRule[ruleId];
        for (const field of fields) {
          const leadValue = customValues[field.custom_field_id];
          if (leadValue === undefined || leadValue === null || leadValue === '') continue;

          const weightFactor = (field.weight_percentage || 50) / 100;
          let answerScores: Record<string, number> = {};
          try {
            answerScores = field.answer_scores ? JSON.parse(field.answer_scores) : {};
          } catch { answerScores = {}; }

          let bestStar = 0;
          const values: string[] = Array.isArray(leadValue) ? leadValue : [String(leadValue)];

          const searchMethod = answerScores['__method__'] || 'exact';

          for (const val of values) {
            const strVal = String(val).toLowerCase().trim();
            for (const [key, stars] of Object.entries(answerScores)) {
              if (key === '__method__' || key === '__filled__') continue;

              const strKey = String(key).toLowerCase().trim();
              let matched = false;

              if (searchMethod === 'contains') {
                if (strVal.includes(strKey)) matched = true;
              } else {
                if (strVal === strKey) matched = true;
              }

              if (matched) {
                const numStars = Number(stars);
                if (numStars > bestStar) bestStar = numStars;
              }
            }
          }

          // If no specific match, use __filled__ fallback if configured
          if (bestStar === 0 && answerScores['__filled__']) {
            bestStar = Number(answerScores['__filled__']);
          }

          const starFactor = bestStar / 10; // 1-10 -> 0.1-1.0
          profileScore += starFactor * weightFactor * 100;
        }
      }

      // 2. Calculate interest score
      for (const ruleId in interestConversionsByRule) {
        const conversions = interestConversionsByRule[ruleId];
        for (const conversion of conversions) {
          const eventIds: string[] = conversion.event_ids ? JSON.parse(conversion.event_ids) : [];
          if (eventIds.length === 0) continue;

          for (const eventId of eventIds) {
            // Count unique conversions for this lead (by form/event ID)
            const { total: eventCount } = await db.prepare(`
              SELECT COUNT(*) as total FROM tracking_events
              WHERE visitor_id IN (SELECT visitor_id FROM visitor_leads WHERE lead_id = ?)
              AND (form_data LIKE ? OR event_type = ? OR id = ?)
            `).bind(lead.id, `%${eventId}%`, eventId, eventId).first();

            if (eventCount > 0) {
              interestScore += (conversion.points || 10) * eventCount;
            }
          }
        }
      }

      // Calculate total and grade
      const totalScore = profileScore + interestScore;
      let grade = 'E';
      if (totalScore >= 80) grade = 'A';
      else if (totalScore >= 60) grade = 'B';
      else if (totalScore >= 40) grade = 'C';
      else if (totalScore >= 20) grade = 'D';

      // Update lead
      await db.prepare(
        'UPDATE leads SET score_profile = ?, score_interest = ?, score_grade = ? WHERE id = ?'
      ).bind(profileScore, interestScore, grade, lead.id).run();

      // History entry (only if score changed significantly or on recalculation)
      const historyId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO lead_score_history (id, account_id, lead_id, score_profile, score_interest, score_total, score_grade) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(historyId, account_id, lead.id, profileScore, interestScore, totalScore, grade).run();
    }

    return { success: true, count: leads.length };
  } catch (error: any) {
    console.error('[SCORING] Helper Error:', error.message);
    throw error;
  }
}
