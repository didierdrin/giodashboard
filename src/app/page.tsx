

'use client';
import { useState } from 'react';
import { auth } from '../../firebaseApp';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { FaHome, FaShoppingCart, FaBoxes, FaHistory, FaUser, FaAd, FaQuestionCircle, FaCog, FaSignOutAlt, FaBell } from 'react-icons/fa';

// Import components
import Overview from '@/components/Overview';
import Library from '@/components/Inventory';
import CurrentOrders from '@/components/CurrentOrders';
import Settings from '@/components/Settings';
import Search from '@/components/Search';

import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { storage, firestore as db } from "../../firebaseApp";

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

function Dashboard() {
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductWithId | null>(null);
  const [user] = useAuthState(auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

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

  // Separate visible menu items
  const visibleMenuItems = [
    { name: 'overview', icon: FaHome, component: Overview },
    { name: 'Inventory', icon: FaBoxes, component: Library },
    { name: 'Orders', icon: FaShoppingCart, component: CurrentOrders },
    { name: 'settings', icon: FaCog, component: Settings },
  ];

  // All components including search
  const allComponents = [
    ...visibleMenuItems,
    { name: 'search', component: () => <Search searchQuery={searchQuery} setEditingProduct={setEditingProduct} /> },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      setActiveTab('search');
    } else {
      setActiveTab('overview');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out: ', error);
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

  const ActiveComponent = allComponents.find(item => item.name === activeTab)?.component || (() => <div>Not found</div>);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-purple-500 min-h-screen flex flex-col text-white p-5 transition-all duration-300`}>
        <div className='flex flex-col flex-grow'>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mb-5 w-full text-left hover:text-slate-300">
            {sidebarOpen ? '« ' : '»'}
          </button>
          {visibleMenuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`flex hover:text-slate-300 hover:underline items-center mb-4 ${activeTab === item.name ? 'text-blue-300' : ''} ${sidebarOpen ? 'w-full mb-7' : 'w-10 mb-10'} overflow-hidden`}
            >
              <item.icon className="mr-2" />
              {sidebarOpen && <span>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center mt-5 border-t-[1px] pt-3 text-slate-300 hover:text-red-600 hover:underline">
          <FaSignOutAlt className="mr-2" />
          {sidebarOpen && <span>Log out</span>}
        </button>
      </div>


      {/* Main content */}
      <div className="flex flex-col w-full transition-width duration-300 ease-in-out"> 
        {/* Header  */}
        <div className="flex items-center justify-between m-2">
          <div className="relative mx-8">
          <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="text-slate-500 text-[20px] cursor-pointer border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm w-[600px] py-1 px-10 pr-12"
            />
            <svg
              className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-indigo-500 hover:text-slate-800"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex space-x-8 mr-8">
            {/* <FaBell className="bg-white h-8 w-8 p-2 border border-black rounded-lg hover:bg-black hover:text-indigo-300 cursor-pointer" /> */}
            <div className="flex space-x-8 mr-8">
        <FaUser 
          className="bg-white h-8 w-8 p-2 border border-black rounded-lg hover:bg-black hover:text-indigo-300 cursor-pointer" 
          title={user?.email || 'No user email'}  // Add this line
        />
      </div>
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
       
        <ActiveComponent />
      </div>
    </div>
  );
}



// app/page.tsx

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const provider = new GoogleAuthProvider();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === "auth/account-exists-with-different-credential") {
        // Fetch the email associated with the Google account
        const email = error.customData.email;
        // Fetch sign-in methods for this email
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods[0] === "password") {
          // The user has a password-based account. Ask them to sign in with password first
          alert(
            "An account already exists with the same email address. Please sign in with your password, then link your Google account."
          );
          // You might want to redirect to a password sign-in page here
        } else {
          console.error("Unexpected sign-in method:", methods[0]);
        }
      } else {
        console.error("Error signing in:", error);
      }
    }
  };

  // const handleGoogleSignIn = () => {
  //   signInWithPopup(auth, provider);
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center">
          {isSignUp ? "Sign Up" : "Login"} to your account
        </h3>
        <form onSubmit={handleEmailSignIn}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="email">
                Email
              </label>
              <input
                type="text"
                placeholder="Email"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                // Absolute positioning with right-2 and inset-y-0
                className="absolute inset-y-0 top-6 -mx-7  items-center"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="flex flex-col items-baseline justify-between">
              <button
                className="px-6 py-2 mt-4 mb-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900"
                type="submit"
              >
                {isSignUp ? "Sign Up" : "Login"}
              </button>
              <a
                href="#"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Login" : "Create account"}
              </a>
            </div>
          </div>
        </form>
        <div className="mt-6">
          <button
            onClick={handleGoogleSignIn}
            className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}


// // Dashboard
// 'use client';
// import { useState } from 'react';
// import { auth } from '../../firebaseApp';
// import { useAuthState } from 'react-firebase-hooks/auth';
// import { signOut } from 'firebase/auth';
// import { useRouter } from 'next/navigation';
// import { FaHome, FaShoppingCart, FaBoxes, FaHistory, FaUser, FaAd, FaQuestionCircle, FaCog, FaSignOutAlt, FaBell } from 'react-icons/fa';

// // Import components
// import Overview from '@/components/Overview';
// import Library from '@/components/Inventory';
// import CurrentOrders from '@/components/CurrentOrders';
// import Advertise from '@/components/Advertise';
// import Help from '@/components/Help';
// import Settings from '@/components/Settings';
// import Search from '@/components/Search';

// import { FaEye, FaEyeSlash, FaSearch } from "react-icons/fa";
// import {
  
//   GoogleAuthProvider,
//   signInWithPopup,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   fetchSignInMethodsForEmail,
// } from "firebase/auth";
// import {
//   collection,
//   onSnapshot,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   serverTimestamp,
// } from "firebase/firestore";
// import dynamic from "next/dynamic";



// import { storage, firestore as db } from "../../firebaseApp";

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

// function Dashboard() {
//   const [products, setProducts] = useState<ProductWithId[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [editingProduct, setEditingProduct] = useState<ProductWithId | null>(null);

//   const [user] = useAuthState(auth);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [activeTab, setActiveTab] = useState('overview');
//   const router = useRouter();


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
  
//   // Modify the search input handler
//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const query = e.target.value;
//     setSearchQuery(query);
//     if (query.trim()) {
//       setActiveTab('search');
//     } else {
//       setActiveTab('overview'); // or whatever default tab you prefer
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       router.push('/');
//     } catch (error) {
//       console.error('Error signing out: ', error);
//     }
//   };

//   const menuItems = [
//     { name: 'overview', icon: FaHome, component: Overview },
//     { name: 'Inventory', icon: FaBoxes, component: Library },
//     { name: 'Orders', icon: FaShoppingCart, component: CurrentOrders },
//     // { name: 'advertise', icon: FaAd, component: Advertise },
//     // { name: 'help', icon: FaQuestionCircle, component: Help },
//     { name: 'settings', icon: FaCog, component: Settings }, // dropdown to select the phone numbers that get order messages. 
//     { name: 'search', icon: FaSearch, component: () => <Search searchQuery={searchQuery} setEditingProduct={setEditingProduct} /> },
//   ];

//   const ActiveComponent = menuItems.find(item => item.name === activeTab)?.component || (() => <div>Not found</div>);



//   const handleUpdateProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingProduct) return;

//     try {
//       const productRef = doc(db, "gioproducts", editingProduct.id);
//       await updateDoc(productRef, {
//         ...editingProduct.data,
//         updatedOn: serverTimestamp()
//       });
//       setEditingProduct(null);
//     } catch (error) {
//       console.error("Error updating product: ", error);
//       alert("Failed to update product");
//     }
//   };

//   // Filter products based on selected category
//   const filteredProducts = products.filter(product => 
//     selectedCategory === 'all' || product.data.category === selectedCategory
//   );


//   return (
//     <div className="flex min-h-screen bg-gray-100">
//       {/* Sidebar */}
//       <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-purple-500 min-h-screen flex flex-col text-white p-5 transition-all duration-300`}>
//         <div className='flex flex-col flex-grow'>
//         <button onClick={() => setSidebarOpen(!sidebarOpen)} className=" mb-5 w-full text-left hover:text-slate-300">
//           {sidebarOpen ? '« ' : '»'}
//         </button>
//         {menuItems.map((item) => (
//           <button
//             key={item.name}
//             onClick={() => setActiveTab(item.name)}
//             className={`flex hover:text-slate-300 hover:underline items-center mb-4 ${activeTab === item.name ? 'text-blue-300' : ''} ${sidebarOpen ? 'w-full mb-7' : 'w-10 mb-10'} overflow-hidden`}
//           >
//             <item.icon className="mr-2" />
//             {sidebarOpen && <span>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>}
//           </button>
//         ))}
    
//         </div>
//         <button onClick={handleLogout} className="flex items-center mt-5 border-t-[1px] pt-3 text-slate-300 hover:text-red-600 hover:underline ">
//           <FaSignOutAlt className="mr-2" />
//           {sidebarOpen && <span>Log out</span>}
//         </button>
//       </div>
