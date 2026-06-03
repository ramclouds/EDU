import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useAssets(fetchWithAuth, showToast) {
  // STATES
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [activeAssetTab, setActiveAssetTab] = useState("All");
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] =
    useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAssetId, setEditingAssetId] =
    useState(null);

  const [deletedAssets, setDeletedAssets] = useState([]);

  // COUNTS
  const [assetCounts, setAssetCounts] = useState({
    all: 0,
    operational: 0,
    repair: 0,
    inactive: 0,
    assigned: 0,
  });

  // FORM STATE
  const [newAsset, setNewAsset] = useState({
    asset_id: "",
    asset_code: "",
    asset_name: "",
    asset_description: "",
    category: "Electronics",
    sub_category: "",
    brand: "",
    model_number: "",
    serial_number: "",
    barcode: "",
    qr_code: "",
    purchase_date: "",
    purchase_cost: "",
    vendor_name: "",
    invoice_number: "",
    warranty_start_date: "",
    warranty_end_date: "",
    depreciation_method: "Straight Line",
    depreciation_rate: "",
    current_book_value: "",
    location: "",
    building_name: "",
    floor_number: "",
    room_number: "",
    condition_status: "Good",
    status: "Operational",
    assigned_to_admin_id: "",
    last_maintenance_date: "",
    next_maintenance_date: "",
    maintenance_notes: "",
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_expiry_date: "",
    asset_image: "",
    remarks: "",
    school_name: "",
    school_code: "",
    created_by: "",
    updated_by: "",
    // VEHICLE
    vehicle_number: "",
    vehicle_type: "",
    registration_number: "",
    fuel_type: "",
    engine_number: "",
    chassis_number: "",
    insurance_expiry: "",
    // ELECTRONICS
    processor: "",
    ram: "",
    storage: "",
    operating_system: "",
    // FURNITURE
    material: "",
    color: "",
    dimensions: "",
    // LAB
    calibration_date: "",
    equipment_accuracy: "",
  });


  // USER
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };


  // FETCH ASSETS
  const fetchAssets = async () => {

    try {
      setAssetLoading(true);
      const res = await fetchWithAuth(
        `${BASE_URL}/assets`
      );

      const data = await res.json();
      const assetList = Array.isArray(data)
        ? data
        : [];

      setAssets(assetList);

      // COUNTS


      setAssetCounts({
        all: assetList.length,

        operational: assetList.filter(
          (a) => a.status === "Operational"
        ).length,

        repair: assetList.filter(
          (a) => a.status === "Under Repair"
        ).length,

        inactive: assetList.filter(
          (a) => a.status === "Inactive"
        ).length,

        assigned: assetList.filter(
          (a) => a.status === "Assigned"
        ).length,
      });

    } catch (err) {

      console.error(err);

      showToast(
        "Failed to load assets",
        "error"
      );

    } finally {

      setAssetLoading(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    fetchAssets();
    fetchDeletedAssets();
  }, []);

  // MODAL
  const openAddAssetModal = () => {
    setIsEditMode(false);
    setEditingAssetId(null);
    resetAssetForm();
    setIsAddAssetModalOpen(true);
  };

  const closeAddAssetModal = () => {
    setIsAddAssetModalOpen(false);
  };

  // EDIT ASSET
  const editAsset = (asset) => {
    setIsEditMode(true);
    setEditingAssetId(asset.id);

    setNewAsset({
      ...asset,

      purchase_date:
        asset.purchase_date?.split("T")[0] || "",

      warranty_start_date:
        asset.warranty_start_date?.split("T")[0] || "",

      warranty_end_date:
        asset.warranty_end_date?.split("T")[0] || "",

      last_maintenance_date:
        asset.last_maintenance_date?.split("T")[0] || "",

      next_maintenance_date:
        asset.next_maintenance_date?.split("T")[0] || "",

      insurance_expiry_date:
        asset.insurance_expiry_date?.split("T")[0] || "",

      insurance_expiry:
        asset.insurance_expiry?.split("T")[0] || "",

      calibration_date:
        asset.calibration_date?.split("T")[0] || "",
    });

    setIsAddAssetModalOpen(true);
  };

  // INPUT CHANGE
  const handleInputChange = (e) => {

    const { name, value } = e.target;

    setNewAsset((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // SEARCH FILTER
  const searchedAssets = assets.filter((asset) =>
    [
      asset.asset_name,
      asset.asset_code,
      asset.category,
      asset.location,
    ]
      .join(" ")
      .toLowerCase()
      .includes(assetSearch.toLowerCase())
  );

  // TAB FILTER
  const filterAssets = (tab) => {
    setActiveAssetTab(tab);

    if (tab === "All") {
      return searchedAssets;
    }

    return searchedAssets.filter(
      (asset) => asset.category === tab
    );
  };

  // FILTERED ASSETS
  const filteredAssets =
    activeAssetTab === "All"
      ? searchedAssets
      : searchedAssets.filter(
        (asset) =>
          asset.category === activeAssetTab
      );

  // RESET FORM
  const resetAssetForm = () => {

    setNewAsset({
      asset_id: "",
      asset_code: "",

      asset_name: "",
      asset_description: "",

      category: "Electronics",
      sub_category: "",

      brand: "",
      model_number: "",
      serial_number: "",

      barcode: "",
      qr_code: "",

      purchase_date: "",
      purchase_cost: "",

      vendor_name: "",
      invoice_number: "",

      warranty_start_date: "",
      warranty_end_date: "",

      depreciation_method: "Straight Line",
      depreciation_rate: "",

      current_book_value: "",

      location: "",
      building_name: "",
      floor_number: "",
      room_number: "",

      condition_status: "Good",

      status: "Operational",

      assigned_to_admin_id: "",

      last_maintenance_date: "",
      next_maintenance_date: "",

      maintenance_notes: "",

      insurance_provider: "",
      insurance_policy_number: "",
      insurance_expiry_date: "",

      asset_image: "",
      remarks: "",
      school_name: "",
      school_code: "",
      created_by: "",
      updated_by: "",
      // VEHICLE
      vehicle_number: "",
      vehicle_type: "",
      registration_number: "",
      fuel_type: "",
      engine_number: "",
      chassis_number: "",
      insurance_expiry: "",
      // ELECTRONICS
      processor: "",
      ram: "",
      storage: "",
      operating_system: "",
      // FURNITURE
      material: "",
      color: "",
      dimensions: "",
      // LAB
      calibration_date: "",
      equipment_accuracy: "",
    });
  };

  // CREATE ASSET
  const addAsset = async (e) => {
    e.preventDefault();
    try {

      const user = getUser();
      const payload = {
        ...newAsset,

        created_by:
          user?.admin_id ||
          user?.teacher_id ||
          user?.student_id,

        updated_by:
          user?.admin_id ||
          user?.teacher_id ||
          user?.student_id,
      };
      // EDIT MODE
      const url = isEditMode
        ? `${BASE_URL}/assets/${editingAssetId}`
        : `${BASE_URL}/assets/create`;

      const method = isEditMode
        ? "PUT"
        : "POST";

      const res = await fetchWithAuth(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {

        showToast(
          isEditMode
            ? "Asset updated successfully ✅"
            : "Asset created successfully ✅"
        );

        fetchAssets();
        resetAssetForm();
        closeAddAssetModal();
        setIsEditMode(false);
        setEditingAssetId(null);

      } else {
        showToast(
          data.error ||
          "Operation failed",
          "error"
        );
      }

    } catch (err) {
      console.error(err);
      showToast(
        "Something went wrong",
        "error"
      );
    }
  };

  const fetchDeletedAssets = async () => {
    try {

      const res = await fetchWithAuth(
        `${BASE_URL}/assets/deleted`
      );

      const data = await res.json();

      if (res.ok) {
        setDeletedAssets(
          Array.isArray(data) ? data : []
        );
      }

    } catch (err) {
      console.error(err);
    }
  };

  // DELETE ASSET
  const deleteAsset = async (id) => {
    try {
      const assetToDelete = assets.find(
        (a) => a.id === id
      );

      const res = await fetchWithAuth(
        `${BASE_URL}/assets/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok) {
        if (assetToDelete) {
          setDeletedAssets((prev) => [
            {
              ...assetToDelete,
              deleted_at:
                new Date().toLocaleString(),
            },
            ...prev,
          ]);
        }

        showToast(
          "Asset deleted successfully"
        );

        fetchAssets();

      } else {

        showToast(
          data.error ||
          "Failed to delete asset",
          "error"
        );
      }

    } catch (err) {

      console.error(err);

      showToast(
        "Delete failed",
        "error"
      );
    }
  };

  // RESTORE DELETED ASSET
  const restoreDeletedAsset = async (asset) => {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/assets/restore/${asset.id}`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast(
          "Asset restored successfully"
        );

        fetchAssets();
        fetchDeletedAssets();

      } else {
        showToast(
          data.error || "Restore failed",
          "error"
        );
      }

    } catch (err) {
      console.error(err);

      showToast(
        "Restore failed",
        "error"
      );
    }
  }; 
  
  // UPDATE ASSET
  const updateAsset = async (
    id,
    updatedData
  ) => {

    try {

      const user = getUser();
      const payload = {
        ...updatedData,

        updated_by:
          user?.admin_id ||
          user?.teacher_id ||
          user?.student_id,
      };

      const res = await fetchWithAuth(
        `${BASE_URL}/assets/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok) {

        showToast(
          "Asset updated successfully"
        );

        fetchAssets();

      } else {

        showToast(
          data.error ||
          "Update failed",
          "error"
        );
      }

    } catch (err) {

      console.error(err);
      showToast(
        "Update failed",
        "error"
      );
    }
  };

  // RETURN
  return {
    // DATA
    assets,
    filteredAssets,
    deletedAssets,
    // STATES
    assetLoading,
    assetSearch,
    setAssetSearch,
    activeAssetTab,
    setActiveAssetTab,
    assetCounts,
    isAddAssetModalOpen,
    setIsAddAssetModalOpen,
    // EDIT MODE
    isEditMode,
    setIsEditMode,
    editingAssetId,
    setEditingAssetId,
    // FORM
    newAsset,
    setNewAsset,
    // METHODS
    fetchAssets,
    filterAssets,
    openAddAssetModal,
    closeAddAssetModal,
    handleInputChange,
    resetAssetForm,
    editAsset,
    // RESTORE
    restoreDeletedAsset,
    // CRUD
    addAsset,
    updateAsset,
    deleteAsset,
  };
}