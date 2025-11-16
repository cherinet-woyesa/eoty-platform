# Resource Library Mock Data Guide

This guide explains how to seed mock data for testing the Resource Library features.

## 📋 What Mock Data Will Be Created

### Resources (18 total)
The seed file creates 18 diverse resources covering:

#### Categories:
- **Scripture** (3 resources)
  - Holy Bible - Ge'ez Version
  - Psalms of David - Amharic Translation
  - Gospel of John - English Study Edition

- **Theology** (3 resources)
  - Introduction to Orthodox Theology
  - The Mystery of the Trinity
  - Sacraments of the Church

- **History** (3 resources)
  - History of the Ethiopian Orthodox Church
  - The Nine Saints of Ethiopia
  - Aksumite Empire and Christianity

- **Liturgy** (3 resources)
  - Divine Liturgy - Complete Text
  - Daily Prayer Book
  - Hymn Collection - Ge'ez Chants

- **Saints** (2 resources)
  - Lives of the Ethiopian Saints
  - St. Tekle Haymanot - The Great Ascetic

- **Prayers** (2 resources)
  - Prayers for All Occasions
  - The Jesus Prayer - Guide and Practice

- **Ethics** (2 resources)
  - Orthodox Christian Ethics
  - Fasting Guidelines - Orthodox Tradition

#### File Types:
- PDF (majority)
- Markdown (.md)
- Plain Text (.txt)
- Image (PNG)

#### Languages:
- English
- Amharic
- Ge'ez

#### Topics:
- Orthodox Doctrine
- Church History
- Spiritual Life
- Worship
- Ethics

#### Authors:
- Various authors including:
  - Ethiopian Orthodox Church
  - Dr. Michael Abebe
  - Metropolitan Yohannes
  - Fr. Samuel Gebre
  - Bishop Tekle
  - Dr. Alemayehu Tsegaye
  - And more...

### AI Summaries
- 5 AI summaries (one for each of the first 5 resources)
- Includes:
  - Summary text (< 250 words)
  - Key points
  - Spiritual insights
  - Quality metrics (word count, relevance score)
  - Admin validation status

### User Notes
- 2 sample notes (if user ID 1 exists)
- Includes:
  - Personal notes
  - Public notes
  - Section anchoring
  - Tags

## 🚀 How to Seed the Data

### Method 1: Using Knex CLI (Recommended)

```bash
cd backend
npx knex seed:run --specific=012_resource_library_mock_data.js
```

### Method 2: Using the Script

```bash
cd backend
node scripts/seed-resource-library.js
```

### Method 3: Using npm script (if configured)

```bash
cd backend
npm run seed:resources
```

## ✅ Verification

After seeding, verify the data was created:

### Check Resources
```sql
SELECT COUNT(*) FROM resources;
-- Should return 18
```

### Check Categories
```sql
SELECT DISTINCT category FROM resources;
-- Should show: Scripture, Theology, History, Liturgy, Saints, Prayers
```

### Check AI Summaries
```sql
SELECT COUNT(*) FROM ai_summaries;
-- Should return 5
```

### Check Filter Options
The filter options will be automatically populated from the seeded resources:
- **Categories**: Scripture, Theology, History, Liturgy, Saints, Prayers
- **Types**: application/pdf, text/markdown, text/plain, image/png
- **Topics**: Orthodox Doctrine, Church History, Spiritual Life, Worship, Ethics
- **Languages**: english, amharic, geez
- **Authors**: Various authors from the seeded resources
- **Tags**: All tags from the resources (bible, scripture, theology, etc.)

## 🧪 Testing Scenarios

With this mock data, you can test:

### 1. Search & Filters
- ✅ Search by title: "Bible", "Theology", "History"
- ✅ Filter by category: Select "Scripture" or "Theology"
- ✅ Filter by type: Select "PDF" or "Markdown"
- ✅ Filter by topic: Select "Orthodox Doctrine"
- ✅ Filter by author: Type "Dr. Michael Abebe"
- ✅ Filter by language: Select "English" or "Amharic"
- ✅ Filter by date range: Set dates to see filtered results
- ✅ Filter by tags: Select tags like "bible", "theology"

### 2. Document Viewer
- ✅ View PDF resources (most resources)
- ✅ View Markdown files
- ✅ View Text files
- ✅ Test text selection
- ✅ Test highlight mode
- ✅ Test fullscreen
- ✅ Test print
- ✅ Test zoom controls

### 3. Notes
- ✅ Create notes on any resource
- ✅ Test rich text formatting
- ✅ Add tags to notes
- ✅ Create notes from text selection
- ✅ View personal and public notes

### 4. AI Summaries
- ✅ View AI summaries (5 resources have summaries)
- ✅ Check quality metrics
- ✅ Test brief vs detailed summaries
- ✅ Verify word count (< 250 words)
- ✅ Verify relevance score (≥ 98%)

### 5. Coverage Audit (Admin)
- ✅ View coverage statistics
- ✅ See breakdown by category
- ✅ See breakdown by type
- ✅ Identify missing categories/topics

## 🔄 Resetting Mock Data

To reset and re-seed:

```bash
# Delete existing resources (be careful!)
cd backend
npx knex raw "DELETE FROM resources; DELETE FROM ai_summaries; DELETE FROM user_notes;"

# Re-seed
npx knex seed:run --specific=012_resource_library_mock_data.js
```

## 📝 Notes

1. **File URLs**: The mock data uses placeholder file URLs (`/uploads/resources/...`). In a real scenario, these would point to actual uploaded files.

2. **User Notes**: Notes are created for user ID 1. If this user doesn't exist, the notes won't be created (but resources and summaries will still be created).

3. **Dates**: Resources have various publication dates (from 3 days ago to 40 days ago) to test date filtering.

4. **Tags**: Tags are stored as JSON arrays. The seed file properly formats them.

5. **Public Access**: All resources are marked as `is_public: true`, so they're accessible to all authenticated users.

## 🐛 Troubleshooting

### Issue: "Resources already exist"
**Solution**: The seed file checks for existing resources and skips if found. Delete existing resources first if you want to re-seed.

### Issue: "User notes not created"
**Solution**: This is expected if user ID 1 doesn't exist. Notes are optional - resources and summaries will still be created.

### Issue: "Filter options are empty"
**Solution**: Make sure the resources were seeded successfully. Filter options are generated from existing resources.

### Issue: "AI summaries not showing"
**Solution**: Only the first 5 resources have AI summaries. Try viewing resources with IDs 1-5.

## 📊 Expected Results

After seeding, you should see:
- ✅ 18 resources in the Resource Library
- ✅ Resources across 6 categories
- ✅ Resources in 3 languages
- ✅ Resources with various file types
- ✅ 5 AI summaries with quality metrics
- ✅ Filter options populated automatically
- ✅ Search autocomplete working with real data

## 🎯 Next Steps

1. Seed the data using one of the methods above
2. Log in as a student
3. Navigate to `/resources`
4. Start testing all the features!

---

**Happy Testing! 🚀**


