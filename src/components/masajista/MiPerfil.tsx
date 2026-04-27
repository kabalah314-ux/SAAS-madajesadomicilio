import { useState } from 'react';
import { User, Save, Star } from 'lucide-react';
import { useApp } from '../../AppContext';
import { TipoServicio } from '../../types';

export default function MiPerfil() {
  const { currentUser, updateMasajista } = useApp();
  const [saving, setSaving] = useState(false);

  if (!currentUser || currentUser.role !== 'masajista') return null;

  const masajista = currentUser as any;
  const [bio, setBio] = useState(masajista.bio || '');
  const [especialidades, setEspecialidades] = useState<TipoServicio[]>(masajista.especialidades || []);
  const [zonasCobertura, setZonasCobertura] = useState<string[]>(masajista.zonas_cobertura || []);
  const [radioCob, setRadioCob] = useState(masajista.radio_cobertura_km || 5);

  const zonasDisponibles = ['Centro', 'Chamartín', 'Salamanca', 'Retiro', 'Chamberí', 'Moncloa', 'Argüelles'];
  const especialidadesDisponibles: TipoServicio[] = ['Relajante', 'Descontracturante', 'Deportivo', 'Prenatal', 'Ayurveda', 'Parejas'];

  const handleSave = () => {
    setSaving(true);
    updateMasajista(masajista.id, {
      bio,
      especialidades,
      zonas_cobertura: zonasCobertura,
      radio_cobertura_km: radioCob
    });
    setTimeout(() => setSaving(false), 1000);
  };

  const toggleEspecialidad = (esp: TipoServicio) => {
    setEspecialidades(prev => 
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );
  };

  const toggleZona = (zona: string) => {
    setZonasCobertura(prev => 
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
        <p className="text-gray-600 mt-1">Gestiona tu información profesional</p>
      </div>

      {/* Sección superior */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            {masajista.foto ? (
              <img 
                src={masajista.foto} 
                alt={masajista.nombre}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={32} className="text-gray-400" />
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 transition shadow-md">
              📷
            </button>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{masajista.nombre} {masajista.apellidos}</h3>
            <p className="text-gray-600">{masajista.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ● Activa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sobre mí */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre mí</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción profesional
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={4}
            maxLength={300}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            placeholder="Cuéntanos sobre tu experiencia y especialización..."
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {bio.length}/300 caracteres
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Especialidades
          </label>
          <div className="flex flex-wrap gap-2">
            {especialidadesDisponibles.map(esp => (
              <button
                key={esp}
                onClick={() => toggleEspecialidad(esp)}
                className={`px-4 py-2 rounded-lg border-2 transition ${
                  especialidades.includes(esp)
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {esp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cobertura */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zona de Cobertura</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Zonas activas
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {zonasDisponibles.map(zona => (
              <button
                key={zona}
                onClick={() => toggleZona(zona)}
                className={`px-4 py-2 rounded-lg border-2 transition text-sm ${
                  zonasCobertura.includes(zona)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {zona}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Radio de cobertura: {radioCob} km
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={radioCob}
            onChange={(e) => setRadioCob(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 km</span>
            <span>15 km</span>
          </div>
        </div>
      </div>

      {/* Mis estadísticas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis Estadísticas</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-2xl mb-1">
              <Star size={24} className="text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-gray-900">{masajista.rating_promedio}</span>
            </div>
            <div className="text-sm text-gray-600">Rating Promedio</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900 mb-1">{masajista.total_sesiones}</div>
            <div className="text-sm text-gray-600">Sesiones Realizadas</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900 mb-1">{masajista.valoraciones?.length || 0}</div>
            <div className="text-sm text-gray-600">Valoraciones Recibidas</div>
          </div>
        </div>

        {masajista.valoraciones && masajista.valoraciones.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Últimas valoraciones</h4>
            <div className="space-y-3">
              {masajista.valoraciones.slice(0, 3).map((val: any) => (
                <div key={val.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-yellow-500">
                      {'★'.repeat(val.estrellas)}{'☆'.repeat(5 - val.estrellas)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(val.fecha).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  {val.comentario && (
                    <p className="text-sm text-gray-700 italic">"{val.comentario}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center gap-2 shadow-md disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={20} />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
