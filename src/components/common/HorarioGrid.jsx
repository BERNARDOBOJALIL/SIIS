const DIAS = [
  { key: 'lunes',     short: 'L' },
  { key: 'martes',    short: 'M' },
  { key: 'miercoles', short: 'M' },
  { key: 'jueves',    short: 'J' },
  { key: 'viernes',   short: 'V' },
  { key: 'sabado',    short: 'S' },
]

const RANGOS = [
  '7:00-9:00',
  '9:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
]

function normalizarDia(dia) {
  return dia?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() ?? ''
}

export default function HorarioGrid({ horario }) {
  if (!Array.isArray(horario)) return null

  const bloques = horario
    .filter(b => b?.dia && b?.inicio && b?.fin)
    .map(b => ({ ...b, diaNorm: normalizarDia(b.dia) }))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ padding: '2px 4px', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'left' }}></th>
            {DIAS.map(d => (
              <th key={d.key}
                style={{ padding: '2px 6px', color: 'var(--color-text-muted)', fontWeight: 700, textAlign: 'center' }}>
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RANGOS.map(rango => {
            const [inicio, fin] = rango.split('-')
            return (
              <tr key={rango}>
                <td style={{ padding: '2px 4px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {inicio}–{fin}
                </td>
                {DIAS.map(d => {
                  const bloque = bloques.find(b => b.diaNorm === d.key && b.inicio === inicio && b.fin === fin)
                  return (
                    <td key={d.key} style={{ padding: '2px 6px', textAlign: 'center' }}>
                      {bloque ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}
                          onMouseEnter={e => {
                            const tip = e.currentTarget.querySelector('.tip')
                            if (tip) tip.style.display = 'block'
                          }}
                          onMouseLeave={e => {
                            const tip = e.currentTarget.querySelector('.tip')
                            if (tip) tip.style.display = 'none'
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: 'var(--color-primary)',
                            margin: '0 auto',
                            cursor: bloque.clase ? 'help' : 'default',
                          }} />
                          {(bloque.clase || bloque.profesor) && (
                            <div className="tip" style={{
                              display: 'none',
                              position: 'absolute',
                              top: '24px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'var(--color-site-black)',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              zIndex: 100,
                              pointerEvents: 'none',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            }}>
                              {bloque.clase && <div style={{ fontWeight: 600 }}>{bloque.clase}</div>}
                              {bloque.profesor && <div style={{ opacity: 0.8 }}>{bloque.profesor}</div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          margin: '0 auto',
                        }} />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}