import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestore as db } from '../../firebaseApp';

type SettingsType = {
  notifications: boolean;
  darkMode: boolean;
  language: string;
  currency: string;
};

interface PhoneNumber {
  id: string;
  number: string;
  isActive: boolean;
}

const Settings = () => {
  const [settings, setSettings] = useState<SettingsType>({
    notifications: true,
    darkMode: false,
    language: 'en',
    currency: 'RWF'
  });

  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean; phoneId: string | null; phoneNumber: string}>({
    isOpen: false,
    phoneId: null,
    phoneNumber: ''
  });

  // Load phone numbers from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'adminPhoneGio'), (snapshot) => {
      const numbers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PhoneNumber[];
      setPhoneNumbers(numbers);
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = (setting: keyof Pick<SettingsType, 'notifications' | 'darkMode'>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [setting]: !prevSettings[setting]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: value
    }));
  };

  const handleAddPhoneNumber = async () => {
    if (!newPhoneNumber.trim()) return;

    try {
      // Add new phone number (initially inactive)
      await addDoc(collection(db, 'adminPhoneGio'), {
        number: newPhoneNumber.trim(),
        isActive: false
      });
      setNewPhoneNumber('');
    } catch (error) {
      console.error('Error adding phone number:', error);
    }
  };

  const handleToggleActive = async (phoneId: string) => {
    try {
      // First set all numbers to inactive
      const batchUpdates = phoneNumbers.map(async (phone) => {
        if (phone.id === phoneId) {
          await updateDoc(doc(db, 'adminPhoneGio', phone.id), {
            isActive: true
          });
        } else if (phone.isActive) {
          await updateDoc(doc(db, 'adminPhoneGio', phone.id), {
            isActive: false
          });
        }
      });

      await Promise.all(batchUpdates);
    } catch (error) {
      console.error('Error updating phone number status:', error);
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (phoneId: string, phoneNumber: string) => {
    setDeleteDialog({
      isOpen: true,
      phoneId,
      phoneNumber
    });
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      phoneId: null,
      phoneNumber: ''
    });
  };

  // Delete phone number
  const handleDeletePhoneNumber = async () => {
    if (!deleteDialog.phoneId) return;

    try {
      await deleteDoc(doc(db, 'adminPhoneGio', deleteDialog.phoneId));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting phone number:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Settings</h3>
      <div className="space-y-6">
        {/* Existing settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            <button
              onClick={() => handleToggle('notifications')}
              className={`w-12 h-6 rounded-full p-1 ${settings.notifications ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${settings.notifications ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Dark Mode</span>
            <button
              onClick={() => handleToggle('darkMode')}
              className={`w-12 h-6 rounded-full p-1 ${settings.darkMode ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${settings.darkMode ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>
        </div>

        {/* Phone Number Management */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium mb-3">Admin Phone Numbers</h4>
          
          {/* Add new phone number */}
          <div className="flex mb-4">
            <input
              type="text"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddPhoneNumber}
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          
          {/* Phone numbers list */}
          <div className="space-y-2">
            {phoneNumbers.length === 0 ? (
              <p className="text-gray-500">No phone numbers added yet</p>
            ) : (
              phoneNumbers.map((phone) => (
                <div key={phone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{phone.number}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(phone.id)}
                      className={`w-12 h-6 rounded-full p-1 ${phone.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${phone.isActive ? 'translate-x-6' : ''}`}></div>
                    </button>
                    <button
                      onClick={() => handleOpenDeleteDialog(phone.id, phone.number)}
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
                      title="Delete phone number"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the phone number: <strong>{deleteDialog.phoneNumber}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseDeleteDialog}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePhoneNumber}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;


// import React, { useState, useEffect } from 'react';
// import { collection, addDoc, onSnapshot, updateDoc, doc } from 'firebase/firestore';
// import { firestore as db } from '../../firebaseApp';

// type SettingsType = {
//   notifications: boolean;
//   darkMode: boolean;
//   language: string;
//   currency: string;
// };

// interface PhoneNumber {
//   id: string;
//   number: string;
//   isActive: boolean;
// }

// const Settings = () => {
//   const [settings, setSettings] = useState<SettingsType>({
//     notifications: true,
//     darkMode: false,
//     language: 'en',
//     currency: 'RWF'
//   });

//   const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
//   const [newPhoneNumber, setNewPhoneNumber] = useState('');

//   // Load phone numbers from Firebase
//   useEffect(() => {
//     const unsubscribe = onSnapshot(collection(db, 'adminPhoneGio'), (snapshot) => {
//       const numbers = snapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       })) as PhoneNumber[];
//       setPhoneNumbers(numbers);
//     });

//     return () => unsubscribe();
//   }, []);

//   const handleToggle = (setting: keyof Pick<SettingsType, 'notifications' | 'darkMode'>) => {
//     setSettings(prevSettings => ({
//       ...prevSettings,
//       [setting]: !prevSettings[setting]
//     }));
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setSettings(prevSettings => ({
//       ...prevSettings,
//       [name]: value
//     }));
//   };

//   const handleAddPhoneNumber = async () => {
//     if (!newPhoneNumber.trim()) return;

//     try {
//       // Add new phone number (initially inactive)
//       await addDoc(collection(db, 'adminPhoneGio'), {
//         number: newPhoneNumber.trim(),
//         isActive: false
//       });
//       setNewPhoneNumber('');
//     } catch (error) {
//       console.error('Error adding phone number:', error);
//     }
//   };

//   const handleToggleActive = async (phoneId: string) => {
//     try {
//       // First set all numbers to inactive
//       const batchUpdates = phoneNumbers.map(async (phone) => {
//         if (phone.id === phoneId) {
//           await updateDoc(doc(db, 'adminPhoneGio', phone.id), {
//             isActive: true
//           });
//         } else if (phone.isActive) {
//           await updateDoc(doc(db, 'adminPhoneGio', phone.id), {
//             isActive: false
//           });
//         }
//       });

//       await Promise.all(batchUpdates);
//     } catch (error) {
//       console.error('Error updating phone number status:', error);
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h3 className="text-xl font-semibold mb-4">Settings</h3>
//       <div className="space-y-6">
//         {/* Existing settings */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <span>Notifications</span>
//             <button
//               onClick={() => handleToggle('notifications')}
//               className={`w-12 h-6 rounded-full p-1 ${settings.notifications ? 'bg-blue-500' : 'bg-gray-300'}`}
//             >
//               <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${settings.notifications ? 'translate-x-6' : ''}`}></div>
//             </button>
//           </div>
//           <div className="flex items-center justify-between">
//             <span>Dark Mode</span>
//             <button
//               onClick={() => handleToggle('darkMode')}
//               className={`w-12 h-6 rounded-full p-1 ${settings.darkMode ? 'bg-blue-500' : 'bg-gray-300'}`}
//             >
//               <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${settings.darkMode ? 'translate-x-6' : ''}`}></div>
//             </button>
//           </div>
       
//         </div>

//         {/* Phone Number Management */}
//         <div className="border-t pt-4">
//           <h4 className="text-lg font-medium mb-3">Admin Phone Numbers</h4>
          
//           {/* Add new phone number */}
//           <div className="flex mb-4">
//             <input
//               type="text"
//               value={newPhoneNumber}
//               onChange={(e) => setNewPhoneNumber(e.target.value)}
//               placeholder="Enter phone number"
//               className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//             <button
//               onClick={handleAddPhoneNumber}
//               className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
//             >
//               Add
//             </button>
//           </div>
          
//           {/* Phone numbers list */}
//           <div className="space-y-2">
//             {phoneNumbers.length === 0 ? (
//               <p className="text-gray-500">No phone numbers added yet</p>
//             ) : (
//               phoneNumbers.map((phone) => (
//                 <div key={phone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
//                   <span>{phone.number}</span>
//                   <button
//                     onClick={() => handleToggleActive(phone.id)}
//                     className={`w-12 h-6 rounded-full p-1 ${phone.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
//                   >
//                     <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${phone.isActive ? 'translate-x-6' : ''}`}></div>
//                   </button>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Settings;