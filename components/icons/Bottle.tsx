import * as React from 'react'

export const Bottle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M10 2h4v2h-4z" />
    <path d="M12 4v2" />
    <path d="M8 6c0 1.5.5 2 1 4s1 4 1 6v2h4v-2c0-2 0.5-4 1-6s1-2.5 1-4" />
    <path d="M6 20h12" />
  </svg>
)

export default Bottle
