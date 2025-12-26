import './PropertyList.css';
import { PropertyEditor } from './PropertyEditor';
import type { EphemeraObject, TypeDefinition, PropertyValue } from '@/lib/types';

interface PropertyListProps {
  object: EphemeraObject;
  typeDef: TypeDefinition;
  onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

export function PropertyList({
  object,
  typeDef,
  onPropertyChange,
}: PropertyListProps) {
  // Filter out title/name properties (handled by ObjectHeader) and hidden properties
  const editableProperties = typeDef.schema.filter(
    (prop) => prop.id !== 'title' && prop.id !== 'name' && !prop.hidden
  );

  if (editableProperties.length === 0) {
    return null;
  }

  return (
    <section className="property-list">
      <h2 className="property-list__title">Properties</h2>
      <div className="property-list__items">
        {editableProperties.map((propDef) => (
          <div key={propDef.id} className="property-list__item">
            <label className="property-list__label" htmlFor={`prop-${propDef.id}`}>
              {propDef.name}
              {propDef.required && <span className="property-list__required">*</span>}
            </label>
            <div className="property-list__editor">
              <PropertyEditor
                id={`prop-${propDef.id}`}
                definition={propDef}
                value={object.properties[propDef.id] ?? null}
                onChange={(value) => onPropertyChange(propDef.id, value)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
