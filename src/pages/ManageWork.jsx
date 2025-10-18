import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";


const ManageWork = () => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const auth = getAuth();



  // 2) tunggu auth siap
  const unsub = onAuthStateChanged(auth, async (user) => {
    console.log("auth user:", user?.uid || "(none)");
    if (!user) return; // belum siap, tunggu

    try {
      // sementara: HAPUS orderBy kalau mau pastikan rules ok dulu
      // const qRef = collection(db, "works");
      const qRef = query(collection(db, "works"), orderBy("postedAt", "desc"));
      const snap = await getDocs(qRef);

      console.log("docs count:", snap.size);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("rows:", rows);
      setWorks(rows);
    } catch (err) {
      console.error("fetch error:", err);
    } finally {
      setLoading(false);
    }
  });

  return () => unsub();
}, []);

  useEffect(() => {
    const run = async () => {
      try {
        // kalau sudah sign-in anonim di firebase.js, boleh hapus 2 baris di bawah
        const auth = getAuth();

        // ambil semua works, urut terbaru (butuh index kalau ada filter/order gabungan)
        const qRef = query(collection(db, "works"), orderBy("postedAt", "desc"));
        const snap = await getDocs(qRef);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setWorks(rows);
      } catch (err) {
        console.error("Error fetching works:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <>
      <h1 className="text-black mb-8 text-4xl">Manage Work</h1>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Thumbnail</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Slug/ID</th>
              <th className="px-6 py-3">Tags</th>
              <th className="px-6 py-3">Date Posted</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {works.map((item) => (
              <tr
                key={item.id}
                className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200"
              >
                <td className="px-6 py-4 align-middle">
                <div className="w-44 aspect-[16/9] overflow-hidden rounded-lg bg-gray-100">
                    <img
                    src={item.coverUrl || "/fallback.jpg"}
                    alt={item.title}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
                    />
                </div>
                </td>
                <td className="px-6 py-4">{item.title}</td>
                <td className="px-6 py-4">{item.slug || item.id}</td>
                <td className="px-6 py-4">{item.tag?.join(", ")}</td>
                <td className="px-6 py-4">{formatDate(item.postedAt)}</td>
                <td className="px-6 py-4">{item.status || "Draft"}</td>
                <td className="px-6 py-4">
                  <Link
                    to={`/work/edit/${item.slug || item.id}`}
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}

            {works.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-400" colSpan={7}>
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManageWork;