exports.up = async function(knex) {
  // Check if tables exist before creating
  const hasLandingPageContent = await knex.schema.hasTable('landing_page_content');
  const hasTestimonials = await knex.schema.hasTable('testimonials');

  const promises = [];

  // Landing page content table
  if (!hasLandingPageContent) {
    promises.push(
      knex.schema.createTable('landing_page_content', (table) => {
        table.increments('id').primary();
        table.text('content_json').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.string('created_by', 255); // Changed to string to match users.id type
        table.string('updated_by', 255); // Changed to string to match users.id type
        table.timestamps(true, true);
      })
    );
  }

  // Testimonials table
  if (!hasTestimonials) {
    promises.push(
      knex.schema.createTable('testimonials', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('role', 255).notNullable();
        table.text('content').notNullable();
        table.integer('rating').defaultTo(5);
        table.string('image_url', 500);
        table.integer('display_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.string('created_by', 255); // Changed to string to match users.id type
        table.timestamps(true, true);
      })
    );
  }

  return Promise.all(promises);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('testimonials'),
    knex.schema.dropTableIfExists('landing_page_content')
  ]);
};

