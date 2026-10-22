import { readJson } from './storage';

/** Order header shown on the ORDER tab and printed on the order PDF (`order-meta`). */
export interface OrderMeta {
  unit: string;
  operation: string;
  banner: string;
}

export const ORDER_META_KEY = 'order-meta';
export const ORDER_META_DEFAULT: OrderMeta = {
  unit: '',
  operation: '',
  banner: 'UNCLASSIFIED // EXERCISE',
};

export const readOrderMeta = (): OrderMeta => ({
  ...ORDER_META_DEFAULT,
  ...readJson<Partial<OrderMeta>>(ORDER_META_KEY, {}),
});
