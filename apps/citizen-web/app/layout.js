import "./globals.css";

export const metadata = {
  title: "GRAHAK-DRISHTI | Consumer perspective",
  description: "Create a private consumer case, track it, and see aggregate issue signals.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><div className="demo-strip">Demo environment · synthetic data only</div>{children}</body>
    </html>
  );
}