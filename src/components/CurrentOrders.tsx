import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore as db } from "../../firebaseApp";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab } from "@mui/material";

interface Product {
  currency: string;
  price: number;
  product: string;
  product_image: string;
  product_name: string;
  quantity: number;
}

interface DeliveryLocation {
  latitude: number;
  longitude: number;
}

interface Order {
  id: string;
  TIN: string;
  accepted: boolean;
  amount: number;
  countryCode: string;
  currency: string;
  date: Timestamp;
  deliveryLocation: DeliveryLocation;
  orderId: string;
  paid: boolean;
  phone: string;
  products: Product[];
  rejected: boolean;
  served: boolean;
  user: string;
  vendor: string;
}

const CurrentOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    let q;
    switch(currentTab) {
      case 0: // Processing
        q = query(
          collection(db, "whatsappOrdersGio"),
          where("rejected", "==", false),
          where("paid", "==", false)
        );
        break;
      case 1: // Completed
        q = query(
          collection(db, "whatsappOrdersGio"),
          where("rejected", "==", false),
          where("paid", "==", true)
        );
        break;
      case 2: // Rejected
        q = query(
          collection(db, "whatsappOrdersGio"),
          where("rejected", "==", true)
        );
        break;
      default:
        q = query(collection(db, "whatsappOrdersGio"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Order, "id">),
      }));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [currentTab]);

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<Order>) => {
    try {
      const orderRef = doc(db, "whatsappOrdersGio", orderId);
      await updateDoc(orderRef, updates);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleTabChange = (_: any, newValue: number) => {
    setCurrentTab(newValue);
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp.toDate());
  };

  return (
    <div className="bg-white">
      <Tabs value={currentTab} onChange={handleTabChange} className="border-b">
        <Tab label="Processing" />
        <Tab label="Completed" />
        <Tab label="Rejected" />
      </Tabs>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders found
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md mb-4 p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold">Order #{order.orderId}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {formatDate(order.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-bold">{order.currency} {order.amount}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-b py-3 mb-4">
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span>{order.phone}</span>
                </div>

                {/* Payment Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment Status</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{order.paid ? 'Paid' : 'Unpaid'}</span>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, { paid: !order.paid })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full
                        ${order.paid ? 'bg-green-500' : 'bg-gray-300'}
                        transition-colors duration-300 ease-in-out
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
                          ${order.paid ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>

                {/* Rejection Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Order Status</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{order.rejected ? 'Rejected' : 'Active'}</span>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, { rejected: !order.rejected })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full
                        ${order.rejected ? 'bg-red-500' : 'bg-gray-300'}
                        transition-colors duration-300 ease-in-out
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
                          ${order.rejected ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>

                {order.deliveryLocation && (
                  <div className="flex justify-between">
                    <span>Delivery Location</span>
                    <span>
                      {order.deliveryLocation.latitude}, {order.deliveryLocation.longitude}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between space-x-4">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Order details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog 
        open={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details #{selectedOrder?.orderId}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <div className="space-y-6 p-4">
              <div>
                <h4 className="font-semibold mb-2">Customer Information</h4>
                <p>Phone: {selectedOrder.phone}</p>
                <p>Country: {selectedOrder.countryCode}</p>
                {selectedOrder.TIN && <p>TIN: {selectedOrder.TIN}</p>}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Products</h4>
                <div className="space-y-2">
                  {selectedOrder.products.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-16 h-16 object-cover rounded mr-3"
                        />
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">{item.currency} {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Total Amount</h4>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{selectedOrder.currency} {selectedOrder.amount}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CurrentOrders;

// // Current Orders

// import { useState, useEffect } from "react";
// import {
//   collection,
//   query,
//   where,
//   onSnapshot,
//   doc,
//   updateDoc,
//   deleteDoc,
//   addDoc,
//   Timestamp,
// } from "firebase/firestore";
// import { firestore as db } from "../../firebaseApp";
// import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab } from "@mui/material";
// import { getAuth } from "firebase/auth";

// interface BasketItem {
//   fold: boolean;
//   ironing: boolean;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface ShippingAddress {
//   addressString: string;
//   latitude: number;
//   longitude: number;
// }

// interface Order {
//   id: string;
//   baskets: BasketItem[];
//   createdAt: Timestamp;
//   deliveryDate: Timestamp;
//   pickupDate: Timestamp;
//   foldFees: number;
//   ironingFees: number;
//   orderId: string;
//   shippingAddress: ShippingAddress;
//   status: string;
//   totalAmount: number;
//   transportationFees: number;
//   userEmail: string;
//   userId: string;
// }

// const CurrentOrders = () => {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [currentTab, setCurrentTab] = useState(0);
//   const auth = getAuth();

//   useEffect(() => {
//     const currentUser = auth.currentUser;
//     if (!currentUser) {
//       console.error("No user logged in");
//       return;
//     }

//     const statuses = ["processing", "completed", "cancelled"];
//     const currentStatus = statuses[currentTab];

//     const q = query(
//       collection(db, "whatsappOrdersGio"),
//       where("status", "==", currentStatus)
//     );

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const ordersData: Order[] = snapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...(doc.data() as Omit<Order, "id">),
//       }));
//       setOrders(ordersData);
//     });

//     return () => unsubscribe();
//   }, [currentTab]);

//   const handleUpdateStatus = async (order: Order, newStatus: string) => {
//     try {
//       const orderRef = doc(db, "whatsappOrdersGio", order.id);
//       await updateDoc(orderRef, {
//         status: newStatus,
//       });
//     } catch (error) {
//       console.error("Error updating order status:", error);
//     }
//   };

//   const handleTabChange = (_: any, newValue: number) => {
//     setCurrentTab(newValue);
//   };

//   const formatDate = (timestamp: Timestamp) => {
//     return new Intl.DateTimeFormat('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     }).format(timestamp.toDate());
//   };

//   const calculateSubtotal = (items: BasketItem[]) => {
//     return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//   };

//   return (
//     <div className="bg-white">
//       <Tabs value={currentTab} onChange={handleTabChange} className="border-b">
//         <Tab label="Processing" />
//         <Tab label="Completed" />
//         <Tab label="Cancelled" />
//       </Tabs>

//       <div className="p-4">
//         {orders.length === 0 ? (
//           <div className="text-center py-8 text-gray-500">
//             No orders found
//           </div>
//         ) : (
//           orders.map((order) => (
//             <div key={order.id} className="bg-white rounded-lg shadow-md mb-4 p-4">
//               <div className="flex justify-between items-center mb-4">
//                 <div>
//                   <h3 className="font-semibold">Order #{order.orderId}</h3>
//                   <p className="text-sm text-gray-500">
//                     Created: {formatDate(order.createdAt)}
//                   </p>
//                 </div>
//                 <div className="text-right">
//                   <p className="text-sm text-gray-600">Total Amount</p>
//                   <p className="font-bold">RWF {order.totalAmount}</p>
//                 </div>
//               </div>

//               <div className="space-y-3 border-t border-b py-3 mb-4">
//                 <div className="flex justify-between">
//                   <span>Status</span>
//                   <span className="font-bold uppercase">{order.status}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Pickup Date</span>
//                   <span>{formatDate(order.pickupDate)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Delivery Date</span>
//                   <span>{formatDate(order.deliveryDate)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Delivery Address</span>
//                   <span>{order.shippingAddress.addressString}</span>
//                 </div>
//               </div>

//               <div className="flex justify-between space-x-4">
//                 <button
//                   onClick={() => setSelectedOrder(order)}
//                   className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
//                 >
//                   Order details
//                 </button>
//                 {order.status === "processing" && (
//                   <button
//                     onClick={() => handleUpdateStatus(order, "completed")}
//                     className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
//                   >
//                     Mark Completed
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       <Dialog 
//         open={!!selectedOrder} 
//         onClose={() => setSelectedOrder(null)}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle>Order Details #{selectedOrder?.orderId}</DialogTitle>
//         <DialogContent>
//           {selectedOrder && (
//             <div className="space-y-6 p-4">
//               <div>
//                 <h4 className="font-semibold mb-2">Customer Information</h4>
//                 <p>Email: {selectedOrder.userEmail}</p>
//                 <p>User ID: {selectedOrder.userId}</p>
//               </div>
              
//               <div>
//                 <h4 className="font-semibold mb-2">Items</h4>
//                 <div className="space-y-2">
//                   {selectedOrder.baskets.map((item, index) => (
//                     <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
//                       <div>
//                         <p className="font-medium">{item.name}</p>
//                         <p className="text-sm text-gray-600">
//                           Quantity: {item.quantity} | 
//                           Fold: {item.fold ? "Yes" : "No"} | 
//                           Iron: {item.ironing ? "Yes" : "No"}
//                         </p>
//                       </div>
//                       <p className="font-medium">RWF {item.price * item.quantity}</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="border-t pt-4">
//                 <h4 className="font-semibold mb-2">Price Breakdown</h4>
//                 <div className="space-y-2">
//                   <div className="flex justify-between">
//                     <span>Subtotal</span>
//                     <span>RWF {calculateSubtotal(selectedOrder.baskets)}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span>Folding Fees</span>
//                     <span>RWF {selectedOrder.foldFees}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span>Ironing Fees</span>
//                     <span>RWF {selectedOrder.ironingFees}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span>Transportation Fees</span>
//                     <span>RWF {selectedOrder.transportationFees}</span>
//                   </div>
//                   <div className="flex justify-between font-bold border-t pt-2">
//                     <span>Total Amount</span>
//                     <span>RWF {selectedOrder.totalAmount}</span>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <h4 className="font-semibold mb-2">Delivery Information</h4>
//                 <p>Address: {selectedOrder.shippingAddress.addressString}</p>
//                 <p>Coordinates: {selectedOrder.shippingAddress.latitude}, {selectedOrder.shippingAddress.longitude}</p>
//                 <p>Pickup Date: {formatDate(selectedOrder.pickupDate)}</p>
//                 <p>Delivery Date: {formatDate(selectedOrder.deliveryDate)}</p>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setSelectedOrder(null)}>Close</Button>
//         </DialogActions>
//       </Dialog>
//     </div>
//   );
// };

// export default CurrentOrders;
