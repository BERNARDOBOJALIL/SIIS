const DIAS = [
  { key: 'lunes',     short: 'L' },
  { key: 'martes',    short: 'M' },
  { key: 'miercoles', short: 'X' },
  { key: 'jueves',    short: 'J' },
  { key: 'viernes',   short: 'V' },
  { key: 'sabado',    short: 'S' },
]

function normalizarDia(dia) {
  return dia?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() ?? ''
}

export default function HorarioGrid({ horario }) {
  if (!Array.isArray(horario) || horario.length === 0) return null

  const bloques = horario
    .filter(b => b?.dia && b?.inicio && b?.fin)
    .map(b => ({ dia: b.dia, inicio: b.inicio, fin: b.fin, clase: b.clase, profesor: b.profesor, diaNorm: normalizarDia(b.dia) }))

  if (bloques.length === 0) return null

  const rangosSet = new Set(bloques.map(b => `${b.inicio}-${b.fin}`))
  const rangos = [...rangosSet].sort((a, b) => {
    const hA = Number(a.split('-')[0].split(':')[0])
    const hB = Number(b.split('-')[0].split(':')[0])
    return hA - hB
  })

  const diasActivos = DIAS.filter(d => bloques.some(b => b.diaNorm === d.key))

  return (
    <div style={{ overflowX: 'visible' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ padding: '2px 4px', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'left' }}></th>
            {diasActivos.map(d => (
              <th key={d.key}
                style={{ padding: '2px 6px', color: 'var(--color-text-muted)', fontWeight: 700, textAlign: 'center' }}>
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rangos.map(rango => {
            const [inicio, fin] = rango.split('-')
            return (
              <tr key={rango}>
                <td style={{ padding: '2px 4px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {inicio}–{fin}
                </td>
                {diasActivos.map(d => {
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
      cursor: 'help',
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