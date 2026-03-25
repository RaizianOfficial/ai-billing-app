export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  createdAt: any; // Firestore Timestamp
}

export interface Sale {
  id: string;
  totalAmount: number;
  createdAt: any; // Firestore Timestamp
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem extends Product {
  quantity: number;
}
