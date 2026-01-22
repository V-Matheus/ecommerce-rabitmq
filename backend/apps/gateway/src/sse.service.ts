import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface OrderUpdateEvent {
  orderId: number;
  status: string;
  message: string;
  timestamp: Date;
  service: string;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private orderUpdates$ = new Subject<OrderUpdateEvent>();

  emitOrderUpdate(event: OrderUpdateEvent): void {
    this.logger.log(`Emitting SSE event for order ${event.orderId}: ${event.status}`);
    this.orderUpdates$.next(event);
  }

  getOrderUpdates(): Observable<OrderUpdateEvent> {
    return this.orderUpdates$.asObservable();
  }
}
