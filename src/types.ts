/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'Masuk' | 'Keluar';

export interface HistoryItem {
  nis: string;
  nominal: number;
  type: TransactionType;
  ket: string;
  tgl: string;
  studentName?: string;
}

export interface ChatMessage {
  text: string;
  isUser: boolean;
}

export interface Student {
  nis: string;
  nama: string;
  saldo: number;
  role: 'user' | 'admin';
  pass?: string;
  history: HistoryItem[];
  chatHistory?: ChatMessage[];
}
