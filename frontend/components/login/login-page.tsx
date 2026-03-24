"use client";

import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_COOKIE_MAP } from "@/lib/api-config";
import { useCookies } from "@/hooks/use-cookies";

const LoginInput = z.object({
  email: z.string().trim().email(),
  password: z.string().trim(),
});

type LoginInputType = {
  email: string;
  password: string;
};
type LoginInputErrors = {
  email: string | null;
  password: string | null;
};

export function LoginPage() {
  const [formData, setFormData] = useState<LoginInputType>({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<LoginInputErrors>({
    email: null,
    password: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { getCookie } = useCookies();

  // Redirect away if already authenticated (handles bfcache / history navigation)
  useEffect(() => {
    function checkAuth() {
      const hasRefreshToken = getCookie(AUTH_COOKIE_MAP.REFRESH_TOKEN);
      if (hasRefreshToken) {
        router.replace("/");
      }
    }

    checkAuth();
    window.addEventListener("pageshow", checkAuth);
    return () => window.removeEventListener("pageshow", checkAuth);
  }, [router, getCookie]);

  async function onSubmit() {
    setFormErrors({ email: null, password: null });

    try {
      const data = LoginInput.parse(formData);
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Login failed");
        return;
      }

      const returnTo = searchParams.get("returnTo") || "/";
      router.replace(returnTo);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const fieldErrors = e.flatten().fieldErrors;
        setFormErrors({
          email: fieldErrors.email?.[0] ?? null,
          password: fieldErrors.password?.[0] ?? null,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-1/2 p-8">
        <h1 className="text-center">Login to Ledger Light</h1>

        <Input
          type="text"
          placeholder="Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.currentTarget.value })
          }
        />
        {formErrors.email && (
          <p className="text-sm text-red-500">{formErrors.email}</p>
        )}
        <Input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.currentTarget.value })
          }
        />
        {formErrors.password && (
          <p className="text-sm text-red-500">{formErrors.password}</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button disabled={loading} onClick={onSubmit}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </Card>
    </div>
  );
}
