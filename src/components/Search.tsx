import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore as db } from "../../firebaseApp";

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

const Search = ({ searchQuery, setEditingProduct }: { searchQuery: string, setEditingProduct: (product: ProductWithId | null) => void }) => {
  const [searchResults, setSearchResults] = useState<ProductWithId[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "gioproducts"), (snapshot) => {
      if (searchQuery.trim()) {
        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as Product,
        }));

        const results = products.filter(product => {
          const productName = product.data.name.toLowerCase();
          const query = searchQuery.toLowerCase();
          return productName.includes(query) || 
                 calculateSimilarity(productName, query) >= 0.2;
        });

        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    });
    return () => unsubscribe();
  }, [searchQuery]);

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Search Results for "{searchQuery}"</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map(({ id, data }) => (
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
            </div>
          ))}
        </div>

        {searchResults.length === 0 && searchQuery && (
          <div className="text-center text-gray-600 mt-8">
            No products found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;