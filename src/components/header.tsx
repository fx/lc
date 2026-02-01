import { Link } from '@tanstack/react-router'
import { InstanceSelector } from '@/components/instance-selector'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="border-b">
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="text-xl font-bold hover:text-primary transition-colors">
          LED Matrix Controller
        </Link>
        <div className="flex items-center gap-4">
          <InstanceSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
