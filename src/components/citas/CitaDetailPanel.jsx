import { useEffect, useState } from 'react'
import { Clock3, FileText, ShieldCheck, UserRound, X } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import CancelCitaButton from './CancelCitaButton'

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function CitaDetailPanel({ isOpen, cita, onClose, onCancelCita }) {
  const [academicoNombre, setAcademicoNombre] = useState('Académico')

  const estadoClass = cita?.estado === 'CONFIRMADA'
    ? 'bg-green-100 text-green-800'
    : cita?.estado === 'PENDIENTE'
      ? 'bg-amber-100 text-amber-800'
      : cita?.estado === 'RECHAZADA'
        ? 'bg-red-100 text-red-800'
        : 'bg-slate-100 text-slate-800'

  useEffect(() => {
    const fetchAcademico = async () => {
      if (!cita?.academicoId) {
        setAcademicoNombre('Académico')
        return
      }

      try {
        const userRef = doc(db, 'usuarios', cita.academicoId)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const data = userSnap.data()
          setAcademicoNombre(data.nombre || data.email || 'Académico')
        } else {
          setAcademicoNombre('Académico')
        }
      } catch {
        setAcademicoNombre('Académico')
      }
    }

    fetchAcademico()
  }, [cita?.academicoId])

  return (
    <div className={`absolute inset-y-0 right-0 w-full sm:w-[380px] bg-white border-l border-site-border shadow-xl transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-site-border">
        <h4 className="text-sm font-semibold text-site-text">Detalle de cita</h4>
        <button type="button" onClick={onClose} className="text-site-muted hover:text-site-text">
          <X size={18} />
        </button>
      </div>

      {cita ? (
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-site-muted inline-flex items-center gap-1"><UserRound size={12} /> Académico</p>
            <p className="text-sm text-site-text font-medium">{academicoNombre}</p>
          </div>

          <div>
            <p className="text-xs text-site-muted inline-flex items-center gap-1"><Clock3 size={12} /> Inicio</p>
            <p className="text-sm text-site-text">{formatDate(cita.fechaHora)}</p>
          </div>

          <div>
            <p className="text-xs text-site-muted inline-flex items-center gap-1"><Clock3 size={12} /> Fin</p>
            <p className="text-sm text-site-text">{formatDate(cita.fechaFin)}</p>
          </div>

          <div>
            <p className="text-xs text-site-muted inline-flex items-center gap-1"><FileText size={12} /> Motivo</p>
            <p className="text-sm text-site-text">{cita.motivo || 'Sin motivo'}</p>
          </div>

          <div>
            <p className="text-xs text-site-muted inline-flex items-center gap-1"><ShieldCheck size={12} /> Estado</p>
            <span className={`inline-flex items-center mt-1 px-2 py-1 rounded-full text-xs font-semibold ${estadoClass}`}>
              {cita.estado}
            </span>
          </div>

          {cita.estado === 'PENDIENTE' && (
            <CancelCitaButton cita={cita} onCancel={onCancelCita} />
          )}
        </div>
      ) : (
        <div className="p-4">
          <p className="text-sm text-site-muted">Selecciona una cita para ver detalles.</p>
        </div>
      )}
    </div>
  )
}
