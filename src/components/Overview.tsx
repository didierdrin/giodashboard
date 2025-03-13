import { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ChartOptions,
  ArcElement
} from 'chart.js';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { firestore as db } from "../../firebaseApp";

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
);

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Order {
  amount: number;
  date: Timestamp;
  paid: boolean;
  rejected: boolean;
  currency: string;
}

interface Product {
  category: string;
  name: string;
  price: number;
  stock_quantity: number;
  show: boolean;
}

const Overview = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [salesData, setSalesData] = useState<{
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor: string }[];
  }>({
    labels: [],
    datasets: [
      {
        label: 'Sales',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  });

  const [productData, setProductData] = useState<{
    labels: string[];
    datasets: { 
      label: string; 
      data: number[]; 
      backgroundColor: string[];
    }[];
  }>({
    labels: [],
    datasets: [{
      label: 'Products by Category',
      data: [],
      backgroundColor: [],
    }],
  });

  // Fetch Sales Data
  useEffect(() => {
    const ordersQuery = query(
      collection(db, "whatsappGioOrders"),
      where("paid", "==", true),
      where("rejected", "==", false)
    );
    
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders: Order[] = snapshot.docs.map(doc => ({
        amount: doc.data().amount || 0,
        date: doc.data().date,
        paid: doc.data().paid,
        rejected: doc.data().rejected,
        currency: doc.data().currency
      }));
      processSalesData(orders);
    });

    return () => unsubscribe();
  }, [timeFrame]);

  // Fetch Product Data
  useEffect(() => {
    const productsQuery = query(collection(db, "gioproducts"));
    
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const products: Product[] = snapshot.docs.map(doc => ({
        category: doc.data().category,
        name: doc.data().name,
        price: doc.data().price,
        stock_quantity: doc.data().stock_quantity,
        show: doc.data().show
      }));
      processProductData(products);
    });

    return () => unsubscribe();
  }, []);

  const processSalesData = (orders: Order[]) => {
    const dataByTimeFrame = groupOrdersByTimeFrame(orders, timeFrame);
    setSalesData({
      labels: dataByTimeFrame.labels,
      datasets: [
        {
          label: 'Completed Sales',
          data: dataByTimeFrame.data,
          backgroundColor: 'rgba(0, 128, 0, 0.6)',
        },
      ],
    });
  };

  const processProductData = (products: Product[]) => {
    const categoryCount: { [key: string]: number } = {};
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
    ];

    products.forEach(product => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });

    const labels = Object.keys(categoryCount);
    const data = Object.values(categoryCount);
    const backgroundColors = colors.slice(0, labels.length);

    setProductData({
      labels,
      datasets: [{
        label: 'Products by Category',
        data,
        backgroundColor: backgroundColors,
      }],
    });
  };

  const groupOrdersByTimeFrame = (orders: Order[], timeFrame: TimeFrame) => {
    const salesByPeriod: { [key: string]: number } = {};
    
    orders.forEach((order) => {
      if (!order.date) return;

      const orderDate = order.date.toDate();
      let periodKey: string;

      switch (timeFrame) {
        case 'daily':
          periodKey = orderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          break;
        case 'weekly':
          const weekNumber = getWeekNumber(orderDate);
          periodKey = `Week ${weekNumber}`;
          break;
        case 'monthly':
          periodKey = orderDate.toLocaleDateString('en-US', {
            month: 'long'
          });
          break;
        case 'yearly':
          periodKey = orderDate.getFullYear().toString();
          break;
        default:
          periodKey = orderDate.toLocaleDateString();
      }

      salesByPeriod[periodKey] = (salesByPeriod[periodKey] || 0) + order.amount;
    });

    const sortedPeriods = Object.entries(salesByPeriod).sort((a, b) => {
      if (timeFrame === 'monthly') {
        return new Date(a[0] + ' 1, 2024').getTime() - new Date(b[0] + ' 1, 2024').getTime();
      }
      return a[0].localeCompare(b[0]);
    });

    return {
      labels: sortedPeriods.map(([label]) => label),
      data: sortedPeriods.map(([_, value]) => value)
    };
  };

  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const salesChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Completed Sales Overview',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount (RWF)',
        },
        ticks: {
          callback: function(value: any) {
            return `RWF ${value.toLocaleString()}`;
          }
        }
      },
      x: {
        type: 'category' as const,
        display: true,
        grid: {
          display: false
        }
      }
    },
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Product Categories Distribution',
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart Section */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Sales Overview</h3>
            <div className="flex items-center">
              <label htmlFor="timeFrame" className="mr-2">Time frame:</label>
              <select
                id="timeFrame"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                className="border rounded-md p-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="h-[400px]">
            <Bar data={salesData} options={salesChartOptions} />
          </div>
        </div>

        {/* Product Categories Chart Section */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-6">Product Categories</h3>
          <div className="h-[400px]">
            <Pie data={productData} options={pieChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;

// // Overview statistics
// import { useState, useEffect } from 'react';
// import { Bar } from 'react-chartjs-2';
// import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
// import {
//   collection,
//   query,
//   onSnapshot,
//   Timestamp,
// } from "firebase/firestore";
// import { firestore as db } from "../../firebaseApp";
// import { getAuth } from "firebase/auth";

// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

// interface Order {
//   totalAmount: number;
//   createdAt: Timestamp;
//   status: string;
// }

// const Overview = () => {
//   const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
//   const [chartData, setChartData] = useState<{
//     labels: string[];
//     datasets: { label: string; data: number[]; backgroundColor: string }[];
//   }>({
//     labels: [],
//     datasets: [
//       {
//         label: 'Sales',
//         data: [],
//         backgroundColor: 'rgba(75, 192, 192, 0.6)',
//       },
//     ],
//   });

//   const auth = getAuth();

//   useEffect(() => {
//     const currentUser = auth.currentUser;
//     if (!currentUser) {
//       console.error("No user logged in");
//       return;
//     }

//     // Query orders collection
//     const ordersQuery = query(collection(db, "whatsappOrdersGio"));
    
//     const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
//       const orders: Order[] = snapshot.docs.map(doc => ({
//         totalAmount: doc.data().totalAmount || 0,
//         createdAt: doc.data().createdAt,
//         status: doc.data().status
//       }));
//       processChartData(orders);
//     });

//     return () => unsubscribe();
//   }, [timeFrame]);

//   const processChartData = (orders: Order[]) => {
//     const dataByTimeFrame = groupOrdersByTimeFrame(orders, timeFrame);
//     setChartData({
//       labels: dataByTimeFrame.labels,
//       datasets: [
//         {
//           label: 'Sales',
//           data: dataByTimeFrame.data,
//           backgroundColor: 'rgba(0, 128, 0, 0.6)',
//         },
//       ],
//     });
//   };

//   const groupOrdersByTimeFrame = (orders: Order[], timeFrame: TimeFrame) => {
//     const salesByPeriod: { [key: string]: number } = {};
    
//     orders.forEach((order) => {
//       if (!order.createdAt) return;

//       const orderDate = order.createdAt.toDate();
//       let periodKey: string;

//       switch (timeFrame) {
//         case 'daily':
//           periodKey = orderDate.toLocaleDateString('en-US', {
//             month: 'short',
//             day: 'numeric'
//           });
//           break;
//         case 'weekly':
//           const weekNumber = getWeekNumber(orderDate);
//           periodKey = `Week ${weekNumber}`;
//           break;
//         case 'monthly':
//           periodKey = orderDate.toLocaleDateString('en-US', {
//             month: 'long'
//           });
//           break;
//         case 'yearly':
//           periodKey = orderDate.getFullYear().toString();
//           break;
//         default:
//           periodKey = orderDate.toLocaleDateString();
//       }

//       salesByPeriod[periodKey] = (salesByPeriod[periodKey] || 0) + order.totalAmount;
//     });

//     // Sort the periods chronologically
//     const sortedPeriods = Object.entries(salesByPeriod).sort((a, b) => {
//       if (timeFrame === 'monthly') {
//         return new Date(a[0] + ' 1, 2024').getTime() - new Date(b[0] + ' 1, 2024').getTime();
//       }
//       return a[0].localeCompare(b[0]);
//     });

//     return {
//       labels: sortedPeriods.map(([label]) => label),
//       data: sortedPeriods.map(([_, value]) => value)
//     };
//   };

//   const getWeekNumber = (date: Date) => {
//     const startOfYear = new Date(date.getFullYear(), 0, 1);
//     const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
//     return Math.ceil((days + startOfYear.getDay() + 1) / 7);
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: {
//         position: 'top' as const,
//       },
//       title: {
//         display: true,
//         text: 'Sales Overview',
//       },
//     },
//     scales: {
//       y: {
//         beginAtZero: true,
//         title: {
//           display: true,
//           text: 'Amount (RWF)'
//         },
//         ticks: {
//           callback: (value: number) => `RWF ${value.toLocaleString()}`
//         }
//       }
//     },
//     animation: {
//       duration: 1000,
//     },
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <div className="flex justify-between items-center mb-6">
//         <h3 className="text-xl font-semibold">Sales Overview</h3>
//         <div className="flex items-center">
//           <label htmlFor="timeFrame" className="mr-2">Time frame:</label>
//           <select
//             id="timeFrame"
//             value={timeFrame}
//             onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
//             className="border rounded-md p-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="daily">Daily</option>
//             <option value="weekly">Weekly</option>
//             <option value="monthly">Monthly</option>
//             <option value="yearly">Yearly</option>
//           </select>
//         </div>
//       </div>
      
//       <div className="h-[400px]">
//         <Bar  data={chartData} />
//       </div>
//     </div>
//   );
// };

// export default Overview;
