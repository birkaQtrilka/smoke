export class Queue<T> {
  private items: Record<number, T>;
  private head: number;
  private tail: number;

  constructor() {
    this.items = {};
    this.head = 0;
    this.tail = 0;
  }

  /**
   * Adds an item to the back of the queue. O(1)
   */
  enqueue(item: T): void {
    this.items[this.tail] = item;
    this.tail++;
  }

  /**
   * Removes and returns the item from the front of the queue. O(1)
   */
  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const item = this.items[this.head];
    delete this.items[this.head]; // Important: free up memory
    this.head++;
    
    return item;
  }

  /**
   * Returns the item at the front without removing it. O(1)
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.head];
  }

  /**
   * Checks if the queue is empty. O(1)
   */
  isEmpty(): boolean {
    return this.head === this.tail;
  }

  /**
   * Returns the current number of items in the queue. O(1)
   */
  size(): number {
    return this.tail - this.head;
  }

  /**
   * Resets the queue. O(1)
   */
  clear(): void {
    this.items = {};
    this.head = 0;
    this.tail = 0;
  }
}