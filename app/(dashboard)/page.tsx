import DashboardPage from '@/app/(dashboard)/dashboard-page';

export default function HomePage() {
  return <DashboardPage />;
}

{data.map((item) => (
  <div key={item.id}>
    <h3>{item.nombre}</h3>
    <p>Proveedor: {item.proveedor}</p>
    <p>Referencia: {item.referencia}</p>
  </div>
))}
