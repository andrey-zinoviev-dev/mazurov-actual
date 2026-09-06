import "./Container.css";

export function Container({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="container">{children}</div>;
}
