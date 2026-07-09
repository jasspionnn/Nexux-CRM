// Shared by the segments and email-marketing route modules — both build a
// leads WHERE clause from user-defined segment rules.
//
// `field` below ends up interpolated directly into SQL as a column name (bind()
// only parameterizes values, not identifiers). It must be checked against this
// allowlist of real `leads` columns before use — otherwise it's SQL injection
// via attacker-controlled segment rules.
export const SEGMENT_ALLOWED_FIELDS = new Set([
  'title', 'company', 'value', 'contact_name', 'contact_email', 'contact_phone',
  'funnel_id', 'stage_id', 'assigned_user_id', 'probability', 'tags',
  'score_profile', 'score_interest', 'score_grade', 'created_at',
]);

export async function buildSegmentQuery(db: any, accountId: string, rules: any[]) {
  let whereClause = 'account_id = ?';
  const params: any[] = [accountId];

  for (const rule of rules) {
    let { field, operator, value } = rule;

    if (field !== 'filled_form' && field !== 'visited_page' && !SEGMENT_ALLOWED_FIELDS.has(field)) {
      continue; // unknown/unsafe field name — skip this rule rather than build SQL from it
    }

    // The UI hides the operator dropdown for special fields, meaning it often defaults to 'contains'
    // or whatever was last selected. We must normalize it to 'equals' (affirmative) or 'not_equals' (negative).
    if (field === 'filled_form') {
      if (operator !== 'not_equals' && operator !== 'not_contains') {
        operator = 'equals';
      } else {
        operator = 'not_equals';
      }
    }

    if (field === 'visited_page') continue; // Temporarily removed from logic

    if (field === 'filled_form') {
      const formInfo: any = await db.prepare(
        'SELECT id, name FROM tracking_forms WHERE (id = ? OR name = ?) AND account_id = ?'
      ).bind(value, value, accountId).first();

      if (formInfo) {
        // Match by lead_id OR contact_email to be robust
        // Match by form_id UUID OR name to handle inconsistent tracking data correctly
        if (operator === 'equals') {
          whereClause += ` AND (
            id IN (SELECT lead_id FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND lead_id IS NOT NULL)
            OR
            contact_email IN (SELECT email FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND email IS NOT NULL)
          )`;
          params.push(accountId, formInfo.id, formInfo.name, accountId, formInfo.id, formInfo.name);
        } else if (operator === 'not_equals') {
          whereClause += ` AND (
            id NOT IN (SELECT lead_id FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND lead_id IS NOT NULL)
            AND
            contact_email NOT IN (SELECT email FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND email IS NOT NULL)
          )`;
          params.push(accountId, formInfo.id, formInfo.name, accountId, formInfo.id, formInfo.name);
        }
      } else if (operator === 'equals') {
        whereClause += ` AND 1=0`;
      }
      continue;
    }

    switch (operator) {
      case 'equals': whereClause += ` AND ${field} = ?`; params.push(value); break;
      case 'not_equals': whereClause += ` AND ${field} != ?`; params.push(value); break;
      case 'contains': whereClause += ` AND ${field} LIKE ?`; params.push(`%${value}%`); break;
      case 'not_contains': whereClause += ` AND ${field} NOT LIKE ?`; params.push(`%${value}%`); break;
      case 'greater_than': whereClause += ` AND ${field} > ?`; params.push(parseFloat(value)); break;
      case 'less_than': whereClause += ` AND ${field} < ?`; params.push(parseFloat(value)); break;
      case 'starts_with': whereClause += ` AND ${field} LIKE ?`; params.push(`${value}%`); break;
      case 'ends_with': whereClause += ` AND ${field} LIKE ?`; params.push(`%${value}`); break;
      case 'is_empty': whereClause += ` AND (${field} IS NULL OR ${field} = '')`; break;
      case 'is_not_empty': whereClause += ` AND ${field} IS NOT NULL AND ${field} != ''`; break;
    }
  }

  return { whereClause, params };
}
