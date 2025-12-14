"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@/styles/auth.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      
      let errorMessage = "Giriş yapılırken bir hata oluştu.";
      
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Geçersiz e-posta adresi.";
          break;
        case "auth/user-disabled":
          errorMessage = "Bu kullanıcı hesabı devre dışı bırakılmış.";
          break;
        case "auth/user-not-found":
          errorMessage = "Bu e-posta adresine kayıtlı kullanıcı bulunamadı.";
          break;
        case "auth/wrong-password":
          errorMessage = "Şifre hatalı.";
          break;
        case "auth/invalid-credential":
          errorMessage = "E-posta veya şifre hatalı.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Ağ hatası. Lütfen internet bağlantınızı kontrol edin.";
          break;
        default:
          errorMessage = error.message || "Giriş yapılırken bir hata oluştu.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Hoş Geldiniz</h1>
          <p className="auth-subtitle">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="checkbox-input"
                disabled={loading}
              />
              <span>Beni Hatırla</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Hesabınız yok mu?{" "}
            <Link href="/auth/signup" className="auth-link">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

