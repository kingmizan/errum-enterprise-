// In your PDF generation function within statement.js
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { db } from '../firebase.js';
import { state } from '../main.js';

// ...
const profileRef = doc(db, "users", state.user.uid, "profile", "info");
const profileSnap = await getDoc(profileRef);
const companyProfile = profileSnap.exists() ? profileSnap.data() : { name: "Errum Enterprise" };

// ... inside jsPDF didDrawPage callback
doc.setFontSize(20);
doc.text(companyProfile.name || 'Errum Enterprise', data.settings.margin.left, 40);
doc.setFontSize(10);
doc.text(companyProfile.address || 'Your Company Address', data.settings.margin.left, 52);
//...
