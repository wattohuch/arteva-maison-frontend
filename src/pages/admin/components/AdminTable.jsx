import Loader from '../../../components/ui/Loader';

/**
 * Shared admin table.
 *
 * Every section previously hand-rolled its own <table> with its own loading and
 * empty handling. Centralising it means one scroll container, one set of
 * borders, one empty state, and consistent behaviour when a column overflows.
 *
 * @param {Array<{key, header, width, align, render}>} columns
 * @param {Array}  rows
 * @param {(row) => string} rowKey
 */
export default function AdminTable({
  columns,
  rows,
  rowKey = (r) => r._id,
  loading = false,
  empty = 'No records found',
  caption,
  onRowClick,
}) {
  if (loading) {
    return <div className="admin-loading"><Loader /></div>;
  }

  if (!rows?.length) {
    return <div className="admin-empty">{empty}</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width, textAlign: col.align }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={(e) => {
                if (e.target.closest('button, input, select, a, .admin-row-actions')) return;
                onRowClick?.(row);
              }}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align }}
                  // Doubles as the stacked-card label on narrow screens
                  data-label={typeof col.header === 'string' ? col.header : undefined}
                >
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
