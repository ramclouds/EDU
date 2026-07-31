const hostelFloorOptions = {
    A: [
        { value: "1", label: "1st Floor" },
        { value: "2", label: "2nd Floor" }
    ],
    B: [
        { value: "1", label: "1st Floor" },
        { value: "2", label: "2nd Floor" }
    ]
};

let hostelRooms = [
    {
        id: 1,
        block: "A",
        blockName: "Building A",
        floor: "1",
        floorName: "1st Floor",
        roomNumber: "001",
        capacity: 3,
        status: "Active",
        beds: [
            { number: "A-001-1", status: "Occupied", student: "Rahul Sharma" },
            { number: "A-001-2", status: "Occupied", student: "Arjun Mehta" },
            { number: "A-001-3", status: "Available", student: null }
        ]
    },
    {
        id: 2,
        block: "A",
        blockName: "Building A",
        floor: "1",
        floorName: "1st Floor",
        roomNumber: "002",
        capacity: 2,
        status: "Active",
        beds: [
            { number: "A-002-1", status: "Occupied", student: "Kabir Khan" },
            { number: "A-002-2", status: "Available", student: null }
        ]
    },
    {
        id: 3,
        block: "A",
        blockName: "Building A",
        floor: "2",
        floorName: "2nd Floor",
        roomNumber: "101",
        capacity: 3,
        status: "Active",
        beds: [
            { number: "A-101-1", status: "Available", student: null },
            { number: "A-101-2", status: "Available", student: null },
            { number: "A-101-3", status: "Maintenance", student: null }
        ]
    },
    {
        id: 4,
        block: "B",
        blockName: "Building B",
        floor: "1",
        floorName: "1st Floor",
        roomNumber: "001",
        capacity: 2,
        status: "Full",
        beds: [
            { number: "B-001-1", status: "Occupied", student: "Ayesha Khan" },
            { number: "B-001-2", status: "Occupied", student: "Diya Shah" }
        ]
    },
    {
        id: 5,
        block: "B",
        blockName: "Building B",
        floor: "1",
        floorName: "1st Floor",
        roomNumber: "002",
        capacity: 3,
        status: "Maintenance",
        beds: [
            { number: "B-002-1", status: "Maintenance", student: null },
            { number: "B-002-2", status: "Maintenance", student: null },
            { number: "B-002-3", status: "Maintenance", student: null }
        ]
    },
    {
        id: 6,
        block: "B",
        blockName: "Building B",
        floor: "2",
        floorName: "2nd Floor",
        roomNumber: "101",
        capacity: 1,
        status: "Active",
        beds: [
            { number: "B-101-1", status: "Available", student: null }
        ]
    }
];

function getRoomType(capacity) {
    if (capacity === 1) return "Single Sharing";
    if (capacity === 2) return "Double Sharing";
    if (capacity === 3) return "Triple Sharing";
    return capacity + " Bed Sharing";
}

function getRoomStatusClasses(status) {
    if (status === "Full") {
        return "bg-blue-100 text-blue-700";
    }

    if (status === "Maintenance") {
        return "bg-orange-100 text-orange-700";
    }

    return "bg-green-100 text-green-700";
}

function getBedClasses(status) {
    if (status === "Occupied") {
        return "bg-purple-100 text-purple-700 border-purple-200";
    }

    if (status === "Maintenance") {
        return "bg-orange-100 text-orange-700 border-orange-200";
    }

    return "bg-green-100 text-green-700 border-green-200";
}

function renderHostelRooms(roomRows = hostelRooms) {
    const grid = document.getElementById("hostelRoomsGrid");
    const emptyState = document.getElementById("roomsEmptyState");

    grid.innerHTML = roomRows.map(room => {
        const occupiedBeds = room.beds.filter(
            bed => bed.status === "Occupied"
        ).length;

        const availableBeds = room.beds.filter(
            bed => bed.status === "Available"
        ).length;

        return `
                <article class="bg-white border border-slate-200 rounded-2xl
                                shadow-sm hover:shadow-lg hover:border-purple-200
                                transition overflow-hidden">

                    <div class="p-5">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <span class="w-12 h-12 rounded-xl
                                    ${room.block === "B"
                ? "bg-pink-100 text-pink-600"
                : "bg-purple-100 text-purple-600"}
                                    flex items-center justify-center font-bold">
                                    ${room.roomNumber}
                                </span>

                                <div>
                                    <p class="text-xs text-slate-500">
                                        ${room.blockName} • ${room.floorName}
                                    </p>

                                    <h3 class="mt-1 font-bold text-slate-900">
                                        Room ${room.roomNumber}
                                    </h3>
                                </div>
                            </div>

                            <span class="px-3 py-1 rounded-full text-[11px]
                                         font-semibold ${getRoomStatusClasses(room.status)}">
                                ${room.status}
                            </span>
                        </div>

                        <div class="mt-5 flex justify-between items-center">
                            <div>
                                <p class="text-xs text-slate-500">Room Type</p>
                                <strong class="text-sm">
                                    ${getRoomType(room.capacity)}
                                </strong>
                            </div>

                            <div class="text-right">
                                <p class="text-xs text-slate-500">Occupancy</p>
                                <strong class="text-sm">
                                    ${occupiedBeds}/${room.capacity}
                                </strong>
                            </div>
                        </div>

                        <div class="mt-5">
                            <p class="text-[11px] font-bold text-slate-400 uppercase">
                                Beds
                            </p>

                            <div class="mt-2 flex flex-wrap gap-2">
                                ${room.beds.map(bed => `
                                    <span title="${bed.student || bed.status}"
                                        class="min-w-9 h-9 px-2 rounded-lg border
                                               flex items-center justify-center
                                               text-xs font-bold
                                               ${getBedClasses(bed.status)}">
                                        ${bed.number.split("-").pop()}
                                    </span>
                                `).join("")}
                            </div>
                        </div>
                    </div>

                    <div class="px-5 py-4 border-t border-slate-100
                                flex items-center justify-between text-xs">
                        <div class="flex gap-4">
                            <span>
                                <strong>${occupiedBeds}</strong>
                                <span class="text-slate-500"> occupied</span>
                            </span>

                            <span>
                                <strong>${availableBeds}</strong>
                                <span class="text-slate-500"> available</span>
                            </span>
                        </div>

                        <button onclick="viewHostelRoom(${room.id})"
                            class="font-semibold text-purple-600 hover:text-purple-800">
                            View Details
                            <i class="bi bi-arrow-right ml-1"></i>
                        </button>
                    </div>
                </article>
            `;
    }).join("");

    emptyState.classList.toggle("hidden", roomRows.length !== 0);
    grid.classList.toggle("hidden", roomRows.length === 0);

    document.getElementById("visibleRoomCount").textContent =
        `${roomRows.length} room${roomRows.length === 1 ? "" : "s"}`;

    updateRoomStatistics();
}

function updateRoomStatistics() {
    const allBeds = hostelRooms.flatMap(room => room.beds);

    document.getElementById("totalRoomsCount").textContent =
        hostelRooms.length;

    document.getElementById("totalBedsCount").textContent =
        allBeds.length;

    document.getElementById("availableBedsCount").textContent =
        allBeds.filter(bed => bed.status === "Available").length;

    document.getElementById("maintenanceRoomsCount").textContent =
        hostelRooms.filter(room => room.status === "Maintenance").length;
}

function filterHostelRooms() {
    const search = document.getElementById("roomSearchInput")
        .value.toLowerCase().trim();

    const block = document.getElementById("roomBlockFilter").value;
    const floor = document.getElementById("roomFloorFilter").value;
    const status = document.getElementById("roomStatusFilter").value;

    const filteredRooms = hostelRooms.filter(room => {
        const searchableText = `
                ${room.roomNumber}
                ${room.blockName}
                ${room.floorName}
                ${getRoomType(room.capacity)}
            `.toLowerCase();

        return (!search || searchableText.includes(search)) &&
            (!block || room.block === block) &&
            (!floor || room.floor === floor) &&
            (!status || room.status === status);
    });

    renderHostelRooms(filteredRooms);
}

function updateRoomFloorFilter() {
    const block = document.getElementById("roomBlockFilter").value;
    const floorSelect = document.getElementById("roomFloorFilter");

    floorSelect.innerHTML = `<option value="">All Floors</option>`;

    const floors = block
        ? hostelFloorOptions[block] || []
        : Object.values(hostelFloorOptions).flat();

    const uniqueFloors = Array.from(
        new Map(floors.map(floor => [floor.value, floor])).values()
    );

    uniqueFloors.forEach(floor => {
        floorSelect.insertAdjacentHTML(
            "beforeend",
            `<option value="${floor.value}">${floor.label}</option>`
        );
    });
}

function openAddRoomModal() {
    const modal = document.getElementById("addRoomModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    showGeneratedBedNumbers();
}

function closeAddRoomModal() {
    const modal = document.getElementById("addRoomModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("addRoomForm").reset();
    updateNewRoomFloorOptions();
}

function updateNewRoomFloorOptions() {
    const block = document.getElementById("newRoomBlock").value;
    const floorSelect = document.getElementById("newRoomFloor");

    floorSelect.innerHTML = `<option value="">Select Floor</option>`;

    (hostelFloorOptions[block] || []).forEach(floor => {
        floorSelect.insertAdjacentHTML(
            "beforeend",
            `<option value="${floor.value}">${floor.label}</option>`
        );
    });

    showGeneratedBedNumbers();
}

function showGeneratedBedNumbers() {
    const block = document.getElementById("newRoomBlock").value || "A";
    const roomNumber = (
        document.getElementById("newRoomNumber").value || "003"
    ).padStart(3, "0");

    const capacity = Number(
        document.getElementById("newRoomCapacity").value || 3
    );

    const bedNumbers = Array.from(
        { length: capacity },
        (_, index) => `${block}-${roomNumber}-${index + 1}`
    );

    document.getElementById("generatedBedsPreview").textContent =
        `Beds: ${bedNumbers.join(", ")}`;
}

document.getElementById("newRoomNumber")
    ?.addEventListener("input", showGeneratedBedNumbers);

function saveHostelRoom(event) {
    event.preventDefault();

    const block = document.getElementById("newRoomBlock").value;
    const floor = document.getElementById("newRoomFloor").value;
    const roomNumber = document.getElementById("newRoomNumber")
        .value.trim()
        .padStart(3, "0");

    const capacity = Number(
        document.getElementById("newRoomCapacity").value
    );

    const duplicateRoom = hostelRooms.some(room =>
        room.block === block &&
        room.floor === floor &&
        room.roomNumber === roomNumber
    );

    if (duplicateRoom) {
        alert("This room already exists on the selected block and floor.");
        return;
    }

    const floorDetails = (hostelFloorOptions[block] || [])
        .find(item => item.value === floor);

    hostelRooms.push({
        id: Date.now(),
        block,
        blockName: `Building ${block}`,
        floor,
        floorName: floorDetails?.label || `Floor ${floor}`,
        roomNumber,
        capacity,
        status: "Active",
        beds: Array.from({ length: capacity }, (_, index) => ({
            number: `${block}-${roomNumber}-${index + 1}`,
            status: "Available",
            student: null
        }))
    });

    closeAddRoomModal();
    renderHostelRooms();
}

function viewHostelRoom(roomId) {
    const room = hostelRooms.find(item => item.id === roomId);

    if (!room) return;

    const content = document.getElementById("roomDetailsContent");

    content.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="w-14 h-14 rounded-2xl bg-purple-100
                             text-purple-600 flex items-center justify-center
                             text-lg font-bold">
                    ${room.roomNumber}
                </span>

                <div>
                    <p class="text-sm text-slate-500">
                        ${room.blockName} • ${room.floorName}
                    </p>

                    <h3 class="text-xl font-bold">
                        Room ${room.roomNumber}
                    </h3>

                    <p class="text-sm text-slate-500">
                        ${getRoomType(room.capacity)}
                    </p>
                </div>
            </div>

            <div class="mt-6">
                <h4 class="font-semibold">Beds and occupants</h4>

                <div class="mt-3 space-y-3">
                    ${room.beds.map(bed => `
                        <div class="flex items-center gap-3 border
                                    border-slate-200 rounded-xl p-3">
                            <span class="w-10 h-10 rounded-xl flex items-center
                                         justify-center font-bold
                                         ${getBedClasses(bed.status)}">
                                ${bed.number.split("-").pop()}
                            </span>

                            <div class="flex-1">
                                <strong class="block text-sm">
                                    ${bed.number}
                                </strong>

                                <small class="text-slate-500">
                                    ${bed.student || bed.status}
                                </small>
                            </div>

                            <span class="text-xs font-semibold">
                                ${bed.status}
                            </span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;

    const modal = document.getElementById("roomDetailsModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeRoomDetailsModal() {
    const modal = document.getElementById("roomDetailsModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function openHostelSection(sectionName) {
    document.querySelector(
        `[data-section="${sectionName}"]`
    )?.click();
}

renderHostelRooms();