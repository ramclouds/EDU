// ================== All Books Section =================
const books = [
    { id: "B001", title: "Physics Fundamentals", author: "H.C. Verma", category: "Science", available: 5, total: 10 },
    { id: "B002", title: "Mathematics Vol 1", author: "R.D. Sharma", category: "Math", available: 2, total: 8 },
    { id: "B003", title: "World History", author: "Ramachandra Guha", category: "History", available: 0, total: 6 },
    { id: "B004", title: "JavaScript Basics", author: "John Doe", category: "Programming", available: 7, total: 7 },
    { id: "B005", title: "Chemistry Guide", author: "Morrison Boyd", category: "Science", available: 1, total: 5 },
    { id: "B006", title: "Data Structures", author: "Mark Allen", category: "Programming", available: 0, total: 4 },
];

function renderBooks(data) {
    const table = document.getElementById("booksTable");
    table.innerHTML = "";

    data.forEach(book => {

        let status = book.available === 0
            ? `<span class="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">Out of Stock</span>`
            : `<span class="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Available</span>`;

        table.innerHTML += `
            <tr>
                <td class="p-3">${book.id}</td>
                <td class="p-3 font-medium">${book.title}</td>
                <td class="p-3">${book.author}</td>
                <td class="p-3">${book.category}</td>
                <td class="p-3">${book.available}/${book.total}</td>
                <td class="p-3">${status}</td>
                <td class="p-3 flex gap-2">
                    <button class="text-blue-600">Edit</button>
                    <button class="text-red-600">Delete</button>
                </td>
            </tr>
        `;
    });
}

// initial render
renderBooks(books);

document.getElementById("searchInput").addEventListener("input", filterBooks);
document.getElementById("categoryFilter").addEventListener("change", filterBooks);

function filterBooks() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = books.filter(book => {
        return (
            (book.title.toLowerCase().includes(search) ||
                book.author.toLowerCase().includes(search)) &&
            (category === "" || book.category === category)
        );
    });

    renderBooks(filtered);
}


// =============== ADD BOOKS SECTION  =================
//  (Add + Render)
let recentBooks = [];

// Generate Random Book ID
function generateBookId() {
    return "B" + Math.floor(1000 + Math.random() * 9000);
}

// Add Book Function
function addBook() {
    const title = document.getElementById("bookTitle").value.trim();
    const author = document.getElementById("bookAuthor").value.trim();
    const category = document.getElementById("bookCategory").value;
    const total = document.getElementById("bookTotal").value;
    const shelf = document.getElementById("bookShelf").value.trim();
    const isbn = document.getElementById("bookISBN").value.trim();

    // Basic Validation
    if (!title || !author || !category || !total) {
        alert("Please fill all required fields");
        return;
    }

    const newBook = {
        id: generateBookId(),
        title,
        author,
        category,
        total,
        available: total,
        shelf,
        isbn
    };

    // Add to top
    recentBooks.unshift(newBook);

    // Keep only last 5
    if (recentBooks.length > 5) {
        recentBooks.pop();
    }

    renderRecentBooks();

    // Reset form
    document.getElementById("bookTitle").value = "";
    document.getElementById("bookAuthor").value = "";
    document.getElementById("bookCategory").value = "";
    document.getElementById("bookTotal").value = "";
    document.getElementById("bookShelf").value = "";
    document.getElementById("bookISBN").value = "";
}

// Render Recent Books
function renderRecentBooks() {
    const table = document.getElementById("recentBooksTable");
    table.innerHTML = "";

    recentBooks.forEach(book => {
        table.innerHTML += `
            <tr>
                <td class="p-3">${book.id}</td>
                <td class="p-3 font-medium">${book.title}</td>
                <td class="p-3">${book.author}</td>
                <td class="p-3">${book.category}</td>
                <td class="p-3">${book.available}</td>
                <td class="p-3">${book.shelf || "-"}</td>
            </tr>
        `;
    });
}

recentBooks = [
    { id: "B1001", title: "Physics Fundamentals", author: "H.C. Verma", category: "Science", available: 10, shelf: "A1" },
    { id: "B1002", title: "Mathematics Vol 1", author: "R.D. Sharma", category: "Math", available: 8, shelf: "B2" },
    { id: "B1003", title: "JavaScript Basics", author: "John Doe", category: "Programming", available: 5, shelf: "C3" },
];

renderRecentBooks();

// ================= CATEGORIES ====================
// Demo categories
let categories = [
    { id: 1, name: "Science", count: 12 },
    { id: 2, name: "Mathematics", count: 8 },
    { id: 3, name: "History", count: 5 },
    { id: 4, name: "Programming", count: 15 },
];

// Render Categories
function renderCategories() {
    const table = document.getElementById("categoryTable");
    table.innerHTML = "";

    categories.forEach((cat, index) => {
        table.innerHTML += `
            <tr>
                <td class="p-3">${index + 1}</td>
                <td class="p-3 font-medium">${cat.name}</td>
                <td class="p-3">${cat.count}</td>
                <td class="p-3">
                    <button onclick="deleteCategory(${cat.id})"
                        class="text-red-600">Delete</button>
                </td>
            </tr>
        `;
    });
}

// Add Category
function addCategory() {
    const name = document.getElementById("categoryName").value.trim();

    if (!name) {
        alert("Enter category name");
        return;
    }

    // Prevent duplicate
    const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert("Category already exists");
        return;
    }

    const newCategory = {
        id: Date.now(),
        name,
        count: 0
    };

    categories.push(newCategory);
    renderCategories();

    document.getElementById("categoryName").value = "";
}

// Delete Category
function deleteCategory(id) {
    if (!confirm("Delete this category?")) return;

    categories = categories.filter(cat => cat.id !== id);
    renderCategories();
}

// Initial render
renderCategories();

// ================= Authors Section ===================
// Demo authors
let authors = [
    { id: 1, name: "H.C. Verma", country: "India", books: 5 },
    { id: 2, name: "R.D. Sharma", country: "India", books: 8 },
    { id: 3, name: "Ramachandra Guha", country: "India", books: 3 },
    { id: 4, name: "John Doe", country: "USA", books: 6 },
];

// Render Authors
function renderAuthors() {
    const table = document.getElementById("authorsTable");
    table.innerHTML = "";

    authors.forEach((author, index) => {
        table.innerHTML += `
            <tr>
                <td class="p-3">${index + 1}</td>
                <td class="p-3 font-medium">${author.name}</td>
                <td class="p-3">${author.country || "-"}</td>
                <td class="p-3">${author.books}</td>
                <td class="p-3 flex gap-2">
                    <button onclick="deleteAuthor(${author.id})"
                        class="text-red-600">Delete</button>
                </td>
            </tr>
        `;
    });
}

// Add Author
function addAuthor() {
    const name = document.getElementById("authorName").value.trim();
    const country = document.getElementById("authorCountry").value.trim();

    if (!name) {
        alert("Enter author name");
        return;
    }

    // Prevent duplicate
    const exists = authors.some(a => a.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert("Author already exists");
        return;
    }

    const newAuthor = {
        id: Date.now(),
        name,
        country,
        books: 0
    };

    authors.push(newAuthor);
    renderAuthors();

    document.getElementById("authorName").value = "";
    document.getElementById("authorCountry").value = "";
}

// Delete Author
function deleteAuthor(id) {
    if (!confirm("Delete this author?")) return;

    authors = authors.filter(a => a.id !== id);
    renderAuthors();
}

// Initial render
renderAuthors();

// ================== Issue Book Section =================
// Demo users
const users = [
    { id: 1, name: "Amit Sharma" },
    { id: 2, name: "Priya Patil" },
    { id: 3, name: "Rahul Verma" }
];

// Demo books (must match your books section)
let issue_books = [
    { id: "B001", title: "Physics Fundamentals", available: 3 },
    { id: "B002", title: "Mathematics Vol 1", available: 0 },
    { id: "B003", title: "JavaScript Basics", available: 5 }
];

let issuedBooks = [];

function loadDropdowns() {
    const userSelect = document.getElementById("issueUser");
    const bookSelect = document.getElementById("issueBook");

    userSelect.innerHTML = '<option value="">Select Member</option>';
    bookSelect.innerHTML = '<option value="">Select Book</option>';

    users.forEach(u => {
        userSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`;
    });

    issue_books.forEach(b => {
        bookSelect.innerHTML += `
            <option value="${b.id}">
                ${b.title} (${b.available} left)
            </option>`;
    });
}

loadDropdowns();

function issueBook() {
    const userId = document.getElementById("issueUser").value;
    const bookId = document.getElementById("issueBook").value;
    const issueDate = document.getElementById("issueDate").value;
    const returnDate = document.getElementById("returnDate").value;

    if (!userId || !bookId || !issueDate || !returnDate) {
        alert("Fill all fields");
        return;
    }

    const issue_books = books.find(b => b.id === bookId);
    const user = users.find(u => u.id == userId);

    if (issue_books.available <= 0) {
        alert("Book not available");
        return;
    }

    // Reduce stock
    issue_books.available--;

    const newIssue = {
        id: "I" + Date.now(),
        user: user.name,
        book: issue_books.title,
        issueDate,
        returnDate
    };

    issuedBooks.unshift(newIssue);

    renderIssuedBooks();
    loadDropdowns(); // update availability
}

function renderIssuedBooks() {
    const table = document.getElementById("issueTable");
    table.innerHTML = "";

    const today = new Date();

    issuedBooks.forEach(issue => {
        const returnD = new Date(issue.returnDate);

        let status = returnD < today
            ? `<span class="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">Overdue</span>`
            : `<span class="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Issued</span>`;

        table.innerHTML += `
            <tr>
                <td class="p-3">${issue.id}</td>
                <td class="p-3">${issue.user}</td>
                <td class="p-3">${issue.issue_books}</td>
                <td class="p-3">${issue.issueDate}</td>
                <td class="p-3">${issue.returnDate}</td>
                <td class="p-3">${status}</td>
            </tr>
        `;
    });
}

// ============ Return Book Section ===============
// Books (shared)
let returnbooks = [
    { id: "B001", title: "Physics Fundamentals", available: 2 },
    { id: "B002", title: "Mathematics Vol 1", available: 0 },
];

// Issued Books (active)
let issued_Books = [
    {
        id: "I1001",
        user: "Amit Sharma",
        book: "Physics Fundamentals",
        bookId: "B001",
        returnDate: "2026-04-10"
    },
    {
        id: "I1002",
        user: "Priya Patil",
        book: "Mathematics Vol 1",
        bookId: "B002",
        returnDate: "2026-04-05"
    }
];

let returnedBooks = [];

function loadReturnDropdown() {
    const select = document.getElementById("returnIssueId");
    select.innerHTML = '<option value="">Select Issued Record</option>';

    issued_Books.forEach(issue => {
        select.innerHTML += `
            <option value="${issue.id}">
                ${issue.user} - ${issue.book}
            </option>
        `;
    });
}

loadReturnDropdown();

function returnBook() {
    const issueId = document.getElementById("returnIssueId").value;
    const actualDate = document.getElementById("actualReturnDate").value;

    if (!issueId || !actualDate) {
        alert("Select record and date");
        return;
    }

    const issue = issued_Books.find(i => i.id === issueId);

    const returnDate = new Date(issue.returnDate);
    const actualReturn = new Date(actualDate);

    // Calculate late days
    let lateDays = Math.ceil((actualReturn - returnDate) / (1000 * 60 * 60 * 24));
    if (lateDays < 0) lateDays = 0;

    const fine = lateDays * 5; // ₹5 per day

    // Increase book stock
    const book = books.find(b => b.id === issue.bookId);
    if (book) book.available++;

    // Move to returned list
    returnedBooks.unshift({
        ...issue,
        actualReturnDate: actualDate,
        fine,
        status: "Returned"
    });

    // Remove from issued
    issuedBooks = issued_Books.filter(i => i.id !== issueId);

    renderReturnedBooks();
    loadReturnDropdown();
}

function renderReturnedBooks() {
    const table = document.getElementById("returnTable");
    table.innerHTML = "";

    returnedBooks.forEach(r => {
        table.innerHTML += `
            <tr>
                <td class="p-3">${r.id}</td>
                <td class="p-3">${r.user}</td>
                <td class="p-3">${r.book}</td>
                <td class="p-3">${r.actualReturnDate}</td>
                <td class="p-3">₹${r.fine}</td>
                <td class="p-3">
                    <span class="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
                        Returned
                    </span>
                </td>
            </tr>
        `;
    });
}

