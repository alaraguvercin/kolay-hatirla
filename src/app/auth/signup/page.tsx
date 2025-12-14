"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@/styles/auth.css";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const validatePassword = (pwd: string): boolean => {
    return pwd.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Lütfen adınızı girin.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Kayıt hatası:", error);

      let errorMessage = "Kayıt olurken bir hata oluştu.";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Geçersiz e-posta adresi.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
          break;
        case "auth/weak-password":
          errorMessage = "Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Bu işlem şu anda devre dışı.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Ağ hatası. Lütfen internet bağlantınızı kontrol edin.";
          break;
        default:
          errorMessage = error.message || "Kayıt olurken bir hata oluştu.";
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
          <h1 className="auth-title">Kayıt Ol</h1>
          <p className="auth-subtitle">Yeni hesap oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Ad Soyad
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Adınız ve Soyadınız"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              required
              disabled={loading}
            />
          </div>

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
            <div className="password-requirements">
              En az 6 karakter olmalıdır
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Şifre Tekrar
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/login" className="auth-link">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

