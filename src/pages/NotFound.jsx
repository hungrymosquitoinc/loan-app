import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="empty-icon">🔍</span>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  )
}
