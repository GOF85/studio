
'use client';
import * as React from 'react';

// This file is no longer in use and will be removed in a future cleanup.
// Please use the AllergenBadge component instead.
const Gluten = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M36.1 91.5c-3.3-15-11-40.4-28-59.5C2 22.8 2 11.2 8.7 5.5s17.3-3.8 26.5 5.4c13.7 13.7 18.2 32.2 14.5 48.7M63.9 91.5c3.3-15 11-40.4 28-59.5 6.1-9.2 6.1-20.8-.6-26.5s-17.3-3.8-26.5 5.4c-13.7 13.7-18.2 32.2-14.5 48.7"
    />
  </svg>
);
const Fish = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M93.3 50c0-11.8-19.6-21.4-43.3-21.4S6.7 38.2 6.7 50s19.6 21.4 43.3 21.4S93.3 61.8 93.3 50Zm-55 0 .9-1.8M26.2 50l-1.8.9"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M93.3 50c-3.1-4.7-4.1-8.5-2.8-10.7 1.3-2.2 5.4-1.8 1.4-7.1s-10.7-3-15.1-1.3c-4.4 1.7-6.8 5.6-7.3 10M64.6 50a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Z"
    />
  </svg>
);
const Milk = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M23.6 5.2 5 36.1v58.7h90V36.1L76.4 5.2Zm-5.4 78.4L25 90.4m25 0h25M50 83.6l-1.8 6.8m26.8-59.5L50 50 23.2 24.1"
    />
  </svg>
);
const Egg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 5.3C25.1 5.3 10.3 35 10.3 56.4S25.1 94.7 50 94.7s39.7-17.9 39.7-38.3S74.9 5.3 50 5.3Z"
    />
  </svg>
);
const Shell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 5.3C27.9 5.3 10.3 27.9 10.3 50S27.9 94.7 50 94.7s39.7-22.6 39.7-44.7S72.1 5.3 50 5.3Z"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 94.7v-89M10.3 50h79.4M24.1 13.5C31 35.8 31 64.2 24.1 86.5m51.8-73c-6.8 22.3-6.8 50.7 0 73"
    />
  </svg>
);
const Peanut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M33.6 62.4c-12.7-5-19.8-19.6-14.8-32.3s19.6-19.8 32.3-14.8 19.8 19.6 14.8 32.3c-4.9 12.5-19.4 19.8-32.3 14.8m30.6-21.7C59.9 29 46.2 29.5 37.9 37.8c-8.3 8.3-7.8 22 .3 30.3m31.4 14.2c12.7 5 19.8 19.6 14.8 32.3s-19.6 19.8-32.3 14.8-19.8-19.6-14.8-32.3c.3-.7.6-1.4.9-2.1"
    />
  </svg>
);
const Soy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M62.5 5.5c-4.4 7.2-12.2 11.7-20.9 11.7s-16.5-4.5-20.9-11.7"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M57.6 11.5c1.4-3.8 2.3-7.8 2.3-12 0-2 .1-4-.2-6-3 1.2-6.2 1.8-9.5 1.8s-6.5-.6-9.5-1.8c-.3 2-.2 4-.2 6 0 4.2.9 8.2 2.3 12m25.6 13.9c-8.2 6.6-18.4 10.4-29.2 10.4s-21-3.8-29.2-10.4L5.3 53.6C16.6 65.1 32.4 72.1 50 72.1s33.4-7 44.7-18.5L74.1 25.4Z"
    />
  </svg>
);
const Nut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 5.3c15.2 0 28.3 8 35.5 20.4l-3.3 22.8c-1.3 9-9.1 15.6-18.2 15.6H36.1c-9.1 0-16.9-6.6-18.2-15.6l-3.3-22.8C21.7 13.3 34.8 5.3 50 5.3Z"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M14.6 48.5c1.3 9 9.1 15.6 18.2 15.6h34.3c9.1 0 16.9-6.6 18.2-15.6l3.3-22.8c1.8-12.7-7-24.3-19.8-24.3-8.8 0-16.3 5.7-18.9 14M50 64.1V93m-23.2-4.9L50 64.1l23.2 24"
    />
  </svg>
);
const Celery = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M58.7 5.5C52 8.4 46 12.8 41.2 18.4c-11.8 13.8-15 31-9.2 46.2l-23.3 24.7H5V30.6h53.7"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M8.7 94.5c23.6 0 52-24.3 64.7-65.7C78.2 17.8 86.8 9.3 95 5.5"
    />
  </svg>
);
const Mustard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 9.6c-22.3 0-40.4 18.1-40.4 40.4S27.7 90.4 50 90.4s40.4-18.1 40.4-40.4S72.3 9.6 50 9.6Zm-9.2 22a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0ZM50 50a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm-9.2 18.4a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Z"
    />
  </svg>
);
const Sesame = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 5.3C25.1 5.3 5.3 25.1 5.3 50S25.1 94.7 50 94.7s44.7-19.8 44.7-44.7S74.9 5.3 50 5.3Z"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M33.6 50a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm16.4-16.4a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm-16.4 32.8a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Z"
    />
  </svg>
);
const Sulfite = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 5.3 5.3 82.2h89.4L50 5.3Zm-4.3 30.4h8.6M50 50v13"
    />
  </svg>
);
const Lupin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M50 9.6c-22.3 0-40.4 18.1-40.4 40.4S27.7 90.4 50 90.4s40.4-18.1 40.4-40.4S72.3 9.6 50 9.6Zm0 13a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm-13 13a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm26 0a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Zm-13 13a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0Z"
    />
  </svg>
);
const Mollusc = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M93.3 58.7c0 19.6-19.6 29.2-43.3 29.2S6.7 78.3 6.7 58.7c0-14.8 12.8-26.2 29.2-31.9"
    />
    <path
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={5}
      d="M35.9 26.8C29 19.3 18.3 12.6 6.7 12.6m63.4 45.9c13.7-2.7 23.2-11.8 23.2-22.3 0-12.8-14.2-23.2-31.9-23.2-15.5 0-29 7.7-35.9 17.5"
    />
  </svg>
);
export { Gluten, Fish, Milk, Egg, Shell, Peanut, Soy, Nut, Celery, Mustard, Sesame, Sulfite, Lupin, Mollusc };
