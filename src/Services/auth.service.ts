import { Injectable } from '@angular/core';
import { supabase } from '../app/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor() {}

  /**
   * Đăng ký tài khoản mới
   * - Tạo người dùng trong Supabase Auth
   * - Ghi thêm thông tin vào bảng `users`
   */
  async signUp(email: string, password: string, name: string, birth: string) {
    email = email.trim();

    // 1. Đăng ký Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;

    // 2. Delay nhỏ (hoặc gọi getSession) để chắc chắn token hoạt động
    await new Promise((resolve) => setTimeout(resolve, 200)); // ⏳ delay nhẹ

    // 3. Lấy lại session để đảm bảo auth.uid() có hiệu lực
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;

    if (!uid) throw new Error('Không thể xác định UID sau đăng ký');

    // 4. Ghi dữ liệu vào bảng users
    const { error: insertError } = await supabase.from('users').insert({
      id: uid,
      email,
      name,
      birth,
      role: 'user',
      is_hidden: false
    });

    if (insertError) throw insertError;
  }
  /**
   * Đăng nhập bằng email và password
   * - Kiểm tra tài khoản có bị khóa không (`is_hidden`)
   * - Trả về vai trò ('user' hoặc 'admin')
   */
  async signIn(email: string, password: string): Promise<'user' | 'admin'> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const userId = data.user.id;

    // Kiểm tra trạng thái tài khoản
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_hidden, role')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (profile?.is_hidden) throw new Error('Tài khoản đã bị vô hiệu hoá');

    return profile.role as 'user' | 'admin';
  }

  /**
   * Lấy vai trò hiện tại (admin/user)
   */
  async getRole(): Promise<'user' | 'admin' | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data.role as 'user' | 'admin';
  }

  /**
   * Lấy thông tin hồ sơ người dùng hiện tại
   */
  async getCurrentProfile() {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Đăng xuất người dùng hiện tại
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
