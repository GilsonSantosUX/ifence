import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useControl } from 'react-map-gl/mapbox';
import type { ControlPosition } from 'react-map-gl/mapbox';
import { useImperativeHandle, forwardRef } from 'react';

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
  position?: ControlPosition;
  onCreate?: (evt: { features: object[] }) => void;
  onUpdate?: (evt: { features: object[]; action: string }) => void;
  onDelete?: (evt: { features: object[] }) => void;
};

export type DrawControlRef = MapboxDraw;

const DrawControl = forwardRef<DrawControlRef, DrawControlProps>((props, ref) => {
  const draw = useControl<MapboxDraw>(
    () => new MapboxDraw(props),
    ({ map }: { map: any }) => {
      if (props.onCreate) map.on('draw.create', props.onCreate);
      if (props.onUpdate) map.on('draw.update', props.onUpdate);
      if (props.onDelete) map.on('draw.delete', props.onDelete);
    },
    ({ map }: { map: any }) => {
      if (props.onCreate) map.off('draw.create', props.onCreate);
      if (props.onUpdate) map.off('draw.update', props.onUpdate);
      if (props.onDelete) map.off('draw.delete', props.onDelete);
    },
    {
      position: props.position,
    }
  );

  useImperativeHandle(ref, () => draw, [draw]);

  return null;
});

export default DrawControl;