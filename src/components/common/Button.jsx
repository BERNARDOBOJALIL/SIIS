export default function Button({ children, onClick, type = 'button', variant = 'primary', disabled = false, className = '' }) {
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-site-white',
    secondary: 'bg-site-bg hover:bg-site-border text-site-text border border-site-border',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
