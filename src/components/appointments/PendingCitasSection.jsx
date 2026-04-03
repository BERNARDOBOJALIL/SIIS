import { Button } from '../common'

export default function PendingCitasSection({
  pendingCitas,
  processingId,
  onAccept,
  onReject,
  formatDateTime,
  compact = false,
}) {
  return (
    <div className={`${compact ? 'bg-transparent border-none p-0' : 'bg-site-surface border border-site-border rounded-xl p-4 md:p-6'}`}>
      {!compact && <h3 className="text-base font-semibold text-site-text mb-4">Solicitudes pendientes</h3>}

      {pendingCitas.length === 0 ? (
        <div className="border border-site-border rounded-lg bg-site-bg p-6 text-center">
          <p className="text-site-text font-medium">No hay solicitudes pendientes</p>
          <p className="text-sm text-site-muted mt-1">Cuando un estudiante solicite una cita, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendingCitas.map(cita => (
            <div key={cita.citaId} className="bg-site-bg border border-site-border rounded-xl p-3.5 transition-colors hover:border-primary/40">
              <div className="grid grid-cols-1 gap-2.5 mb-3">
                <div>
                  <p className="text-xs text-site-muted mb-1">Estudiante</p>
                  <p className="text-sm text-site-text font-medium">{cita.estudianteNombre || 'Estudiante'}</p>
                </div>
                <div>
                  <p className="text-xs text-site-muted mb-1">Inicio</p>
                  <p className="text-xs text-site-text">{formatDateTime(cita.fechaHora)}</p>
                </div>
                <div>
                  <p className="text-xs text-site-muted mb-1">Estado</p>
                  <p className="text-xs font-semibold text-amber-700">{cita.estado}</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-site-muted mb-1">Motivo</p>
                <p className="text-xs text-site-text line-clamp-2">{cita.motivo}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => onAccept(cita.citaId, cita.estudianteId)}
                  disabled={processingId === cita.citaId}
                  className="flex-1 !py-1.5 !text-xs"
                >
                  {processingId === cita.citaId ? 'Procesando...' : 'Aceptar'}
                </Button>
                <Button
                  onClick={() => onReject(cita.citaId, cita.estudianteId)}
                  disabled={processingId === cita.citaId}
                  variant="danger"
                  className="flex-1 !py-1.5 !text-xs"
                >
                  {processingId === cita.citaId ? 'Procesando...' : 'Rechazar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
