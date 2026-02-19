exports.up = (pgm) => {
  pgm.createTable('budget_entries', {
    id: 'id',
    entry_date: {
      type: 'date',
      notNull: true
    },
    category: {
      type: 'varchar(100)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    amount: {
      type: 'decimal(10,2)',
      notNull: true
    },
    entry_type: {
      type: 'varchar(20)',
      notNull: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    source_file: {
      type: 'varchar(255)'
    }
  });

  pgm.createIndex('budget_entries', 'entry_date');
  pgm.createIndex('budget_entries', 'category');
  pgm.createIndex('budget_entries', 'entry_type');
  
  pgm.addConstraint('budget_entries', 'check_entry_type', {
    check: "entry_type IN ('income', 'expense')"
  });
};

exports.down = (pgm) => {
  pgm.dropTable('budget_entries');
};
