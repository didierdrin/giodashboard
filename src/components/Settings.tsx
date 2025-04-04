import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc } from 'firebase/firestore';
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
          {/* <div>
            <label htmlFor="language" className="block mb-1">Language</label>
            <select
              id="language"
              name="language"
              value={settings.language}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="block mb-1">Currency</label>
            <select
              id="currency"
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="RWF">RWF</option>
              <option value="USD">USD</option>
            </select>
          </div> */}
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
                  <button
                    onClick={() => handleToggleActive(phone.id)}
                    className={`w-12 h-6 rounded-full p-1 ${phone.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out ${phone.isActive ? 'translate-x-6' : ''}`}></div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;