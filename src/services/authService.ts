import { supabase } from "../supabaseClient.js";

export interface AdminUser {
  email: string;
  name: string;
}

export const authService = {
  /**
   * Logs in an admin user using Supabase auth credentials.
   */
  async login(emailInput: string, passwordInput: string): Promise<AdminUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput
    });

    if (error) {
      throw error;
    }

    if (data && data.user) {
      const adminData: AdminUser = {
        email: data.user.email || "",
        name: "Shipplix Operations Admin"
      };
      
      localStorage.setItem("shipplix_admin_session", JSON.stringify({
        success: true,
        user: adminData
      }));

      return adminData;
    }

    throw new Error("Failed to authenticate. Invalid administrator credentials.");
  },

  /**
   * Signs out the user and clears sessions.
   */
  async logout(): Promise<void> {
    localStorage.removeItem("shipplix_admin_session");
    await supabase.auth.signOut();
  },

  /**
   * Gets the active local session.
   */
  getLocalSession(): AdminUser | null {
    try {
      const stored = localStorage.getItem("shipplix_admin_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.success && parsed.user) {
          return parsed.user;
        }
      }
    } catch (e) {
      console.error("Failed to parse local session", e);
    }
    return null;
  }
};
