const fs = require('fs');
const path = 'src/i18n/locales/am/translation.json';
let content = fs.readFileSync(path, 'utf8');

const marker = '"failed": "አልተሳካም"';
const index = content.lastIndexOf(marker);

if (index === -1) {
    console.error("Marker not found");
    process.exit(1);
}

const newContent = `        "failed": "አልተሳካም"
      }
    },
    "support_tickets": {
      "title": "የድጋፍ ቲኬቶች",
      "subtitle": "የተጠቃሚ ድጋፍ ጥያቄዎችን ያስተዳድሩ",
      "create_ticket": "ቲኬት ይፍጠሩ",
      "status": {
        "open": "ክፍት",
        "in_progress": "በሂደት ላይ",
        "resolved": "ተፈትቷል",
        "closed": "ተዘግቷል"
      },
      "priority": {
        "low": "ዝቅተኛ",
        "medium": "መካከለኛ",
        "high": "ከፍተኛ",
        "urgent": "አስቸኳይ"
      },
      "empty": "ምንም ቲኬቶች አልተገኙም"
    }
  }
}},
  "student_courses": {
    "enrolled_badge": "የተመዘገቡ",
    "students_label": "ተማሪዎች",
    "lessons_label": "ትምህርቶች",
    "preview_btn": "ቅድመ እይታ",
    "manage_btn": "ያስተዳድሩ",
    "beginner": "ጀማሪ",
    "intermediate": "መካከለኛ",
    "advanced": "ከፍተኛ",
    "my_courses": "የእኔ ኮርሶች",
    "browse_courses_btn": "ኮርሶችን ያስሱ",
    "no_enrolled": "እስካሁን በምንም ኮርስ አልተመዘገቡም።",
    "no_courses_found": "ምንም ኮርሶች አልተገኙም።",
    "start_journey_desc": "የኮርስ ካታሎግን በማሰስ ይጀምሩ።",
    "adjust_filters_prompt": "ፍለጋዎን ወይም ማጣሪያዎችዎን ለማስተካከል ይሞክሩ።"
  }
}`;

// Keep everything before the marker
const prefix = content.substring(0, index);
// Write the new file
fs.writeFileSync(path, prefix + newContent);
console.log("File updated successfully");
