interface ParseItem {
  namePattern: string;
  quantity: number;
}

const parseMessageRegex = (message: string): ParseItem[] => {
  const regex = /(\d+(?:\.\d+)?)\s*(?:packet|pieces|piece|pcs|ltr|pc|kg|l)?\s*([a-zA-Z\s]+?)(?:and|,|\.|$)/gi;
  const items: ParseItem[] = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(message)) !== null) {
    items.push({
      quantity: parseFloat(match[1]),
      namePattern: match[2].trim().toLowerCase()
    });
  }
  return items;
};

const mapQueryCategory = (query: string): 'galla' | 'milk' | 'production' | 'farmer' | 'unknown' => {
  const q = query.toLowerCase();
  if (q.includes('galla') || q.includes('cash') || q.includes('money')) {
    return 'galla';
  }
  if (q.includes('milk') || q.includes('collection') || q.includes('collect')) {
    return 'milk';
  }
  if (q.includes('paneer') || q.includes('produce') || q.includes('production') || q.includes('batch')) {
    return 'production';
  }
  if (q.includes('farmer') || q.includes('settlement') || q.includes('advance') || q.includes('ledger')) {
    return 'farmer';
  }
  return 'unknown';
};

describe('AI Order Regex Parsing & Keyword Mapping Math', () => {

  describe('parseMessageRegex', () => {

    it('should parse standard quantity and product patterns', () => {
      const msg = 'Need 2 kg paneer and 10 ltr milk';
      const result = parseMessageRegex(msg);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ quantity: 2, namePattern: 'paneer' });
      expect(result[1]).toEqual({ quantity: 10, namePattern: 'milk' });
    });

    it('should handle decimal quantities correctly', () => {
      const msg = 'send 1.5 kg ghee';
      const result = parseMessageRegex(msg);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ quantity: 1.5, namePattern: 'ghee' });
    });

    it('should parse simple integers without unit labels', () => {
      const msg = 'Need 5 paneer';
      const result = parseMessageRegex(msg);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ quantity: 5, namePattern: 'paneer' });
    });

  });

  describe('mapQueryCategory', () => {

    it('should map galla query keywords', () => {
      expect(mapQueryCategory('show expected cash galla')).toBe('galla');
      expect(mapQueryCategory('how much money do we have')).toBe('galla');
    });

    it('should map milk collections keywords', () => {
      expect(mapQueryCategory('what is today milk pool collection?')).toBe('milk');
    });

    it('should map production batches keywords', () => {
      expect(mapQueryCategory('paneer production this week')).toBe('production');
      expect(mapQueryCategory('active production batch')).toBe('production');
    });

    it('should map farmer settlements keywords', () => {
      expect(mapQueryCategory('outstanding farmer payouts due')).toBe('farmer');
    });

    it('should return unknown for random text', () => {
      expect(mapQueryCategory('who is Krishna?')).toBe('unknown');
    });

  });

});
