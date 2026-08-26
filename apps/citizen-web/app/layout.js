import "./globals.css";

export const metadata = {
  title: "GRAHAK-DRISHTI | Report a consumer issue",
  description: "Report a consumer issue and receive a docket to track it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><div className="demo-strip">Demo environment · synthetic data only</div>{children}</body>
    </html>
  );
}