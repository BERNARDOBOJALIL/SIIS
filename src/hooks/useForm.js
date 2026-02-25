import { useState } from 'react'

/**
 * Hook para manejar el estado y validación de formularios.
 * @param {object} initialValues
 */
export function useForm(initialValues = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
  }

  return { values, errors, setErrors, handleChange, reset, setValues }
}
