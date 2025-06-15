import { Component, OnInit } from '@angular/core';
import { supabase } from '../../../../../supabase.client';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

// Component con (standalone)
import { StatCardComponent } from '../stat-card/stat-card.component';
import { EventsTableComponent } from '../events-table/events-table.component';
import { BarChartComponent } from '../bar-chart/bar-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    StatCardComponent,
    EventsTableComponent,
    BarChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  // Stat card values
  totalEvents = 0;
  totalRooms = 0;
  totalUsers = 0;
  newMessages = 0;
  pastMessages = 0;

  // Chart
  userChartLabels: string[] = [];
  userChartData: number[] = [];
  eventChartLabels: string[] = [];
  eventChartData: number[] = [];


  // Dropdown
  // timeFrames = ['This Week', 'Last Week', 'This Month'];
  // selectedTimeFrame = 'This Week';
  timeFrames = ['This Month', 'Last Month', 'Next Month'];
  selectedTimeFrame = 'This Month';


  async ngOnInit() {
    await this.loadStats();
    await this.loadEventStats();
    await this.loadUserStats();
    // this.generateUserChartData();
  }

  async loadStats() {
    const { data: events } = await supabase.from('events').select('id');
    this.totalEvents = events?.length || 0;

    const { data: rooms } = await supabase.from('chat_rooms').select('id');
    this.totalRooms = rooms?.length || 0;

    const { data: messages } = await supabase.from('messages').select('*');
    this.newMessages = messages?.filter(m => !m.is_read)?.length || 0;
    this.pastMessages = messages?.filter(m => m.is_flagged)?.length || 0;
  }
  //
  // async loadEventStats() {
  //   const days = this.selectedTimeFrame === 'This Week' ? 7 :
  //     this.selectedTimeFrame === 'Last Week' ? 14 : 30;
  //
  //   const fromDate = new Date();
  //   fromDate.setDate(fromDate.getDate() - days);
  //
  //   const { data, error } = await supabase
  //     .from('events')
  //     .select('created_at')
  //     .gte('created_at', fromDate.toISOString());  // Lọc theo mốc thời gian
  //
  //   if (error || !data) {
  //     console.error('Error loading event data:', error);
  //     return;
  //   }
  //
  //   // Đếm số event theo ngày
  //   const dailyCounts: { [date: string]: number } = {};
  //   data.forEach((e: any) => {
  //     const date = new Date(e.created_at).toISOString().split('T')[0];
  //     dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  //   });
  //
  //   const sortedDates = Object.keys(dailyCounts).sort();
  //   const values = sortedDates.map(d => dailyCounts[d]);
  //
  //   this.eventChartLabels = sortedDates;
  //   this.eventChartData = values;
  // }



  // async loadEventStats() {
  //   const days = this.selectedTimeFrame === 'This Week' ? 7 :
  //     this.selectedTimeFrame === 'Last Week' ? 14 : 30;
  //
  //   const fromDate = new Date();
  //   fromDate.setDate(fromDate.getDate() - days);
  //
  //   const { data, error } = await supabase
  //     .from('events')
  //     .select('start_time')
  //     .gte('start_time', fromDate.toISOString());
  //
  //   if (error || !data) {
  //     console.error('Error loading event data:', error);
  //     return;
  //   }
  //
  //   const dailyCounts: { [date: string]: number } = {};
  //   data.forEach((e: any) => {
  //     const date = new Date(e.start_time).toISOString().split('T')[0];
  //     dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  //   });
  //
  //   const sortedDates = Object.keys(dailyCounts).sort();
  //   const values = sortedDates.map(d => dailyCounts[d]);
  //
  //   this.eventChartLabels = sortedDates;
  //   this.eventChartData = values;
  //
  //   // (Optional) Nếu bạn muốn hiển thị tổng Event thống kê được
  //   this.totalEvents = values.reduce((sum, count) => sum + count, 0);
  // }

  async loadEventStats() {
    let fromDate = new Date();
    let toDate = new Date();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0–11

    if (this.selectedTimeFrame === 'This Month') {
      fromDate = new Date(currentYear, currentMonth, 1);
      toDate = new Date(currentYear, currentMonth + 1, 0);

    } else if (this.selectedTimeFrame === 'Last Month') {
      fromDate = new Date(currentYear, currentMonth - 1, 1);
      toDate = new Date(currentYear, currentMonth, 0);

    } else if (this.selectedTimeFrame === 'Next Month') {
      fromDate = new Date(currentYear, currentMonth + 1, 1);
      toDate = new Date(currentYear, currentMonth + 2, 0);
    }

    // Set hours to full range of day
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('events')
      .select('start_time')
      .gte('start_time', fromDate.toISOString())
      .lte('start_time', toDate.toISOString());

    if (error || !data) {
      console.error('Error loading event data:', error);
      return;
    }

    const dailyCounts: { [date: string]: number } = {};
    data.forEach((e: any) => {
      // const date = new Date(e.start_time).toISOString().split('T')[0];
      const dateObj = new Date(e.start_time);
      const date = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }); // e.g. "Jun 15"

      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyCounts).sort();
    const values = sortedDates.map(d => dailyCounts[d]);

    this.eventChartLabels = sortedDates;
    this.eventChartData = values;
    this.totalEvents = values.reduce((sum, count) => sum + count, 0);
  }




  async loadUserStats() {
    const { data: users } = await supabase.from('users').select('id');
    if (!users) return;

    this.totalUsers = users.length;

    const chunks = 20; // 20 cột cho bar chart
    this.userChartLabels = Array.from({ length: chunks }, (_, i) => `${i + 1}`);

    // Tạo dữ liệu phân bố ngẫu nhiên, tổng = users.length
    const values = Array.from({ length: chunks }, () => 0);
    for (let i = 0; i < users.length; i++) {
      const index = Math.floor(Math.random() * chunks);
      values[index]++;
    }

    this.userChartData = values;
  }


  // Khi user chọn mốc thời gian mới
  async onTimeFrameChange() {
    await this.loadUserStats(); // vẫn dùng full list
    await this.loadEventStats();
  }


  // generateUserChartData() {
  //   this.userChartLabels = Array.from({ length: 20 }, (_, i) => `${i + 1}`);
  //   this.userChartData = Array.from({ length: 20 }, () => Math.floor(Math.random() * 60));
  // }
}
