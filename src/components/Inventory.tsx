import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, firestore as db, auth } from "../../firebaseApp";

interface Product {
  name: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  image: string;
  show: boolean;
  createdOn: any;
  updatedOn: any;
}

type ProductWithId = {
  id: string;
  data: Product;
};

const Library = () => {
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<ProductWithId | null>(null);

  const categories = [
    "all",
    "elitra-plus-series",
    "weather-proof-of",
    "group-sockets",
    "accessory",
    "automation-group",
    "mechanical-group",
    "cable-trunking",
    "lighting-group"
  ];

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    category: "lighting-group",
    price: 0,
    stock_quantity: 0,
    show: true,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "gioproducts"), (snapshot) => {
      setProducts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as Product,
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  const uploadFile = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Please sign in to add products");
      return;
    }

    if (!imageFile || !newProduct.name || !newProduct.description) {
      alert("Please fill in all required fields and upload an image");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadFile(
        imageFile,
        `products/${newProduct.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`
      );

      await addDoc(collection(db, "gioproducts"), {
        ...newProduct,
        image: imageUrl,
        createdOn: serverTimestamp(),
        updatedOn: serverTimestamp(),
      });

      setNewProduct({
        name: "",
        description: "",
        category: "lighting-group",
        price: 0,
        stock_quantity: 0,
        show: true,
      });
      setImageFile(null);
    } catch (error) {
      console.error("Error adding product: ", error);
      alert("Failed to add product");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteDoc(doc(db, "gioproducts", id));
    } catch (error) {
      console.error("Error deleting product: ", error);
      alert("Failed to delete product");
    }
  };

  const handleToggleShow = async (id: string, currentShow: boolean) => {
    try {
      const productRef = doc(db, "gioproducts", id);
      await updateDoc(productRef, {
        show: !currentShow,
        updatedOn: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating product visibility: ", error);
      alert("Failed to update product visibility");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const productRef = doc(db, "gioproducts", editingProduct.id);
      await updateDoc(productRef, {
        ...editingProduct.data,
        updatedOn: serverTimestamp()
      });
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product: ", error);
      alert("Failed to update product");
    }
  };

  // Filter products based on selected category
  const filteredProducts = products.filter(product => 
    selectedCategory === 'all' || product.data.category === selectedCategory
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Product Upload</h3>

      <form onSubmit={handleAddProduct} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Price"
            value={newProduct.price || ""}
            onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Stock Quantity"
            value={newProduct.stock_quantity || ""}
            onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={newProduct.category}
            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            {categories.slice(1).map((category) => (
              <option key={category} value={category}>
                {category.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newProduct.show}
              onChange={(e) => setNewProduct({ ...newProduct, show: e.target.checked })}
              className="mr-2"
            />
            Show Product
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition duration-200 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Add Product"}
        </button>
      </form>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Product Inventory</h3>
          <div className="flex items-center">
            <label htmlFor="category" className="mr-2 text-sm text-gray-600">
              Filter by Category:
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded-md p-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(({ id, data }) => (
            <div
              key={id}
              className="border rounded-lg p-4 hover:shadow-md transition duration-200 cursor-pointer"
              onClick={() => setEditingProduct({ id, data })}
            >
              <img 
                src={data.image} 
                alt={data.name}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-lg">{data.name}</h4>
                <span className="font-medium text-green-600">RWF{data.price}</span>
              </div>
              <p className="text-sm text-gray-600">{data.description}</p>
              <p className="text-sm text-gray-600">Stock: {data.stock_quantity}</p>
              <p className="text-sm text-gray-600">Category: {data.category}</p>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Visibility:</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening edit dialog
                    handleToggleShow(id, data.show);
                  }}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    ${data.show ? 'bg-green-500' : 'bg-gray-300'}
                    transition-colors duration-300 ease-in-out
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
                      ${data.show ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening edit dialog
                    handleDeleteProduct(id);
                  }}
                  className="text-red-500 hover:text-red-700 font-medium transition duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Edit Product</h3>
            
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={editingProduct.data.name}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    data: { ...editingProduct.data, name: e.target.value }
                  })}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editingProduct.data.description}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    data: { ...editingProduct.data, description: e.target.value }
                  })}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={editingProduct.data.price}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    data: { ...editingProduct.data, price: parseFloat(e.target.value) }
                  })}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Stock Quantity"
                  value={editingProduct.data.stock_quantity}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    data: { ...editingProduct.data, stock_quantity: parseInt(e.target.value) }
                  })}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={editingProduct.data.category}
                  onChange={(e) => setEditingProduct({
                    ...editingProduct,
                    data: { ...editingProduct.data, category: e.target.value }
                  })}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {categories.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingProduct.data.show}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      data: { ...editingProduct.data, show: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  Show Product
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;


// import { useState, useEffect } from "react";
// import {
//   collection,
//   onSnapshot,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   serverTimestamp,
// } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage, firestore as db, auth } from "../../firebaseApp";

// interface Product {
//   name: string;
//   description: string;
//   category: string;
//   price: number;
//   stock_quantity: number;
//   image: string;
//   show: boolean;
//   createdOn: any;
//   updatedOn: any;
// }

// type ProductWithId = {
//   id: string;
//   data: Product;
// };

// const Library = () => {
//   const [products, setProducts] = useState<ProductWithId[]>([]);
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState<string>('all');

//   const categories = [
//     "all",
//     "elitra-plus-series",
//     "weather-proof-of",
//     "group-sockets",
//     "accessory",
//     "automation-group",
//     "mechanical-group",
//     "cable-trunking",
//     "lighting-group"
//   ];

//   const [newProduct, setNewProduct] = useState<Partial<Product>>({
//     name: "",
//     description: "",
//     category: "lighting-group",
//     price: 0,
//     stock_quantity: 0,
//     show: true,
//   });

//   useEffect(() => {
//     const unsubscribe = onSnapshot(collection(db, "gioproducts"), (snapshot) => {
//       setProducts(
//         snapshot.docs.map((doc) => ({
//           id: doc.id,
//           data: doc.data() as Product,
//         }))
//       );
//     });
//     return () => unsubscribe();
//   }, []);

//   const uploadFile = async (file: File, path: string) => {
//     const storageRef = ref(storage, path);
//     await uploadBytes(storageRef, file);
//     return getDownloadURL(storageRef);
//   };

//   const handleAddProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!auth.currentUser) {
//       alert("Please sign in to add products");
//       return;
//     }

//     if (!imageFile || !newProduct.name || !newProduct.description) {
//       alert("Please fill in all required fields and upload an image");
//       return;
//     }

//     setLoading(true);
//     try {
//       const imageUrl = await uploadFile(
//         imageFile,
//         `products/${newProduct.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`
//       );

//       await addDoc(collection(db, "gioproducts"), {
//         ...newProduct,
//         image: imageUrl,
//         createdOn: serverTimestamp(),
//         updatedOn: serverTimestamp(),
//       });

//       setNewProduct({
//         name: "",
//         description: "",
//         category: "lighting-group",
//         price: 0,
//         stock_quantity: 0,
//         show: true,
//       });
//       setImageFile(null);
//     } catch (error) {
//       console.error("Error adding product: ", error);
//       alert("Failed to add product");
//     }
//     setLoading(false);
//   };

//   const handleDeleteProduct = async (id: string) => {
//     if (!confirm("Are you sure you want to delete this product?")) return;

//     try {
//       await deleteDoc(doc(db, "gioproducts", id));
//     } catch (error) {
//       console.error("Error deleting product: ", error);
//       alert("Failed to delete product");
//     }
//   };

//   const handleToggleShow = async (id: string, currentShow: boolean) => {
//     try {
//       const productRef = doc(db, "gioproducts", id);
//       await updateDoc(productRef, {
//         show: !currentShow,
//         updatedOn: serverTimestamp()
//       });
//     } catch (error) {
//       console.error("Error updating product visibility: ", error);
//       alert("Failed to update product visibility");
//     }
//   };

//   // Filter products based on selected category
//   const filteredProducts = products.filter(product => 
//     selectedCategory === 'all' || product.data.category === selectedCategory
//   );

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h3 className="text-xl font-semibold mb-4">Product Upload</h3>

//       <form onSubmit={handleAddProduct} className="mb-8 space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <input
//             type="text"
//             placeholder="Product Name"
//             value={newProduct.name}
//             onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="text"
//             placeholder="Description"
//             value={newProduct.description}
//             onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="number"
//             placeholder="Price"
//             value={newProduct.price || ""}
//             onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="number"
//             placeholder="Stock Quantity"
//             value={newProduct.stock_quantity || ""}
//             onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
          
//           {/* Add category dropdown to the form */}
//           <select
//             value={newProduct.category}
//             onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           >
//             {categories.slice(1).map((category) => (
//               <option key={category} value={category}>
//                 {category.split('-').map(word => 
//                   word.charAt(0).toUpperCase() + word.slice(1)
//                 ).join(' ')}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Product Image</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => setImageFile(e.target.files?.[0] || null)}
//             className="w-full"
//           />
//         </div>

//         <div className="flex items-center space-x-4">
//           <label className="flex items-center">
//             <input
//               type="checkbox"
//               checked={newProduct.show}
//               onChange={(e) => setNewProduct({ ...newProduct, show: e.target.checked })}
//               className="mr-2"
//             />
//             Show Product
//           </label>
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition duration-200 disabled:opacity-50"
//         >
//           {loading ? "Uploading..." : "Add Product"}
//         </button>
//       </form>

//       <div className="mb-6">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-medium">Product Inventory</h3>
//           <div className="flex items-center">
//             <label htmlFor="category" className="mr-2 text-sm text-gray-600">
//               Filter by Category:
//             </label>
//             <select
//               id="category"
//               value={selectedCategory}
//               onChange={(e) => setSelectedCategory(e.target.value)}
//               className="border rounded-md p-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               {categories.map((category) => (
//                 <option key={category} value={category}>
//                   {category === 'all' ? 'All Categories' : category.split('-').map(word => 
//                     word.charAt(0).toUpperCase() + word.slice(1)
//                   ).join(' ')}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {filteredProducts.map(({ id, data }) => (
//             <div
//               key={id}
//               className="border rounded-lg p-4 hover:shadow-md transition duration-200"
//             >
//               <img 
//                 src={data.image} 
//                 alt={data.name}
//                 className="w-full h-48 object-cover rounded-lg mb-3"
//               />
//               <div className="flex justify-between items-start mb-3">
//                 <h4 className="font-semibold text-lg">{data.name}</h4>
//                 <span className="font-medium text-green-600">${data.price}</span>
//               </div>
//               <p className="text-sm text-gray-600">{data.description}</p>
//               <p className="text-sm text-gray-600">Stock: {data.stock_quantity}</p>
//               <p className="text-sm text-gray-600">Category: {data.category}</p>
              
//               <div className="flex items-center justify-between mt-2">
//                 <span className="text-sm text-gray-600">Visibility:</span>
//                 <button
//                   onClick={() => handleToggleShow(id, data.show)}
//                   className={`
//                     relative inline-flex h-6 w-11 items-center rounded-full
//                     ${data.show ? 'bg-green-500' : 'bg-gray-300'}
//                     transition-colors duration-300 ease-in-out
//                   `}
//                 >
//                   <span
//                     className={`
//                       inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
//                       ${data.show ? 'translate-x-6' : 'translate-x-1'}
//                     `}
//                   />
//                 </button>
//               </div>

//               <div className="flex justify-end space-x-3 mt-4">
//                 <button
//                   onClick={() => handleDeleteProduct(id)}
//                   className="text-red-500 hover:text-red-700 font-medium transition duration-200"
//                 >
//                   Delete
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Library;


// import { useState, useEffect } from "react";
// import {
//   collection,
//   onSnapshot,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   serverTimestamp,
// } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage, firestore as db, auth } from "../../firebaseApp";

// interface Product {
//   name: string;
//   description: string;
//   category: string;
//   price: number;
//   stock_quantity: number;
//   image: string;
//   show: boolean;
//   createdOn: any;
//   updatedOn: any;
// }

// type ProductWithId = {
//   id: string;
//   data: Product;
// };

// const Library = () => {
//   const [products, setProducts] = useState<ProductWithId[]>([]);
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);

//   const [newProduct, setNewProduct] = useState<Partial<Product>>({
//     name: "",
//     description: "",
//     category: "lighting-group",
//     price: 0,
//     stock_quantity: 0,
//     show: true,
//   });

//   useEffect(() => {
//     const unsubscribe = onSnapshot(collection(db, "gioproducts"), (snapshot) => {
//       setProducts(
//         snapshot.docs.map((doc) => ({
//           id: doc.id,
//           data: doc.data() as Product,
//         }))
//       );
//     });
//     return () => unsubscribe();
//   }, []);

//   const uploadFile = async (file: File, path: string) => {
//     const storageRef = ref(storage, path);
//     await uploadBytes(storageRef, file);
//     return getDownloadURL(storageRef);
//   };

//   const handleAddProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!auth.currentUser) {
//       alert("Please sign in to add products");
//       return;
//     }

//     if (!imageFile || !newProduct.name || !newProduct.description) {
//       alert("Please fill in all required fields and upload an image");
//       return;
//     }

//     setLoading(true);
//     try {
//       // Upload image
//       const imageUrl = await uploadFile(
//         imageFile,
//         `products/${newProduct.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`
//       );

//       // Add document to Firestore
//       const docRef = await addDoc(collection(db, "gioproducts"), {
//         ...newProduct,
//         image: imageUrl,
//         createdOn: serverTimestamp(),
//         updatedOn: serverTimestamp(),
//       });

//       // Reset form
//       setNewProduct({
//         name: "",
//         description: "",
//         category: "lighting-group",
//         price: 0,
//         stock_quantity: 0,
//         show: true,
//       });
//       setImageFile(null);
//     } catch (error) {
//       console.error("Error adding product: ", error);
//       alert("Failed to add product");
//     }
//     setLoading(false);
//   };

//   const handleDeleteProduct = async (id: string) => {
//     if (!confirm("Are you sure you want to delete this product?")) return;

//     try {
//       await deleteDoc(doc(db, "gioproducts", id));
//     } catch (error) {
//       console.error("Error deleting product: ", error);
//       alert("Failed to delete product");
//     }
//   };



//   const handleToggleShow = async (id: string, currentShow: boolean) => {
//     try {
//       const productRef = doc(db, "gioproducts", id);
//       await updateDoc(productRef, {
//         show: !currentShow,
//         updatedOn: serverTimestamp()
//       });
//     } catch (error) {
//       console.error("Error updating product visibility: ", error);
//       alert("Failed to update product visibility");
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h3 className="text-xl font-semibold mb-4">Product Upload</h3>

//       <form onSubmit={handleAddProduct} className="mb-8 space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <input
//             type="text"
//             placeholder="Product Name"
//             value={newProduct.name}
//             onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="text"
//             placeholder="Description"
//             value={newProduct.description}
//             onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="number"
//             placeholder="Price"
//             value={newProduct.price || ""}
//             onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//           <input
//             type="number"
//             placeholder="Stock Quantity"
//             value={newProduct.stock_quantity || ""}
//             onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) })}
//             className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Product Image</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => setImageFile(e.target.files?.[0] || null)}
//             className="w-full"
//           />
//         </div>

//         <div className="flex items-center space-x-4">
//           <label className="flex items-center">
//             <input
//               type="checkbox"
//               checked={newProduct.show}
//               onChange={(e) => setNewProduct({ ...newProduct, show: e.target.checked })}
//               className="mr-2"
//             />
//             Show Product
//           </label>
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition duration-200 disabled:opacity-50"
//         >
//           {loading ? "Uploading..." : "Add Product"}
//         </button>
//       </form>

//       <div className="mb-6">
//         <h3 className="text-lg font-medium mb-4">Product Inventory</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {products.map(({ id, data }) => (
//             <div
//               key={id}
//               className="border rounded-lg p-4 hover:shadow-md transition duration-200"
//             >
//               <img 
//                 src={data.image} 
//                 alt={data.name}
//                 className="w-full h-48 object-cover rounded-lg mb-3"
//               />
//               <div className="flex justify-between items-start mb-3">
//                 <h4 className="font-semibold text-lg">{data.name}</h4>
//                 <span className="font-medium text-green-600">${data.price}</span>
//               </div>
//               <p className="text-sm text-gray-600">{data.description}</p>
//               <p className="text-sm text-gray-600">Stock: {data.stock_quantity}</p>
//               {/* <p className="text-sm text-gray-600">Status: {data.show ? 'Visible' : 'Hidden'}</p> */}
//                {/* Replace the status text with this toggle button */}
//                <div className="flex items-center justify-between mt-2">
//                 <span className="text-sm text-gray-600">Visibility:</span>
//                 <button
//                   onClick={() => handleToggleShow(id, data.show)}
//                   className={`
//                     relative inline-flex h-6 w-11 items-center rounded-full
//                     ${data.show ? 'bg-green-500' : 'bg-gray-300'}
//                     transition-colors duration-300 ease-in-out
//                   `}
//                 >
//                   <span
//                     className={`
//                       inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
//                       ${data.show ? 'translate-x-6' : 'translate-x-1'}
//                     `}
//                   />
//                 </button>
//               </div>
//               <div className="flex justify-end space-x-3 mt-4">
//                 <button
//                   onClick={() => handleDeleteProduct(id)}
//                   className="text-red-500 hover:text-red-700 font-medium transition duration-200"
//                 >
//                   Delete
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Library;


