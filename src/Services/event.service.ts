import { Injectable } from '@angular/core';
import {supabase} from '../app/supabase.client';
import { Event } from '../Models/event.model';

@Injectable({ providedIn: 'root' })
export class EventService {

  // ✅ Lấy danh sách tất cả sự kiện (order by created_at)
  async getAllEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // ✅ Tạo một sự kiện mới
  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ✅ Upload ảnh sự kiện (tùy chọn)
  async uploadEventImage(file: File): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase
      .storage
      .from('event-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase
      .storage
      .from('event-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // ✅ Xoá sự kiện (theo id)
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }
  // ✅ Cập nhật sự kiện theo ID
  async updateEvent(eventId: string, updatedFields: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update(updatedFields)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
