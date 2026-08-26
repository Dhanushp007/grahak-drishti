import "./globals.css";

export const metadata = {
  title: "GRAHAK-DRISHTI | Command center",
  description: "Aggregate consumer protection intelligence for authorized analysts.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><div className="demo-strip">Demo environment · synthetic data only</div>{children}</body></html>;
}