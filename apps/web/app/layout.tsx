import "./globals.css";
import { ReactQueryProvider } from "../lib/rq";
import { AuthProvider } from "../lib/auth";
import Header from "../components/Header";

export const metadata = { title: "Lex Marketplace" };

export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            <Header />
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}