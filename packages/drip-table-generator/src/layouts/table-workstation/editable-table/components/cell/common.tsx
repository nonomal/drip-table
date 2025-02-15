/**
 * This file is part of the drip-table project.
 * @link     : https://drip-table.jd.com/
 * @author   : helloqian12138 (johnhello12138@163.com)
 * @modifier : helloqian12138 (johnhello12138@163.com)
 * @copyright: Copyright (c) 2020 JD Network Technology Co., Ltd.
 */

import './index.less';

import { Alert } from 'antd';
import {
  DripTableBuiltInColumnSchema,
  DripTableExtraOptions,
  DripTableProps,
  DripTableRecordTypeBase,
  DripTableRecordTypeWithSubtable,
  ExtractDripTableExtraOption,
  TABLE_LAYOUT_COLUMN_RENDER_GENERATOR_DO_NOT_USE_IN_PRODUCTION as columnRenderGenerator,
} from 'drip-table';
import React from 'react';

import { filterAttributes } from '@/utils';
import { createEvaluator, evaluate, finalizeString, safeEvaluate } from '@/utils/sandbox';
import { DripTableGeneratorProps } from '@/typing';

export interface CommonCellProps<
  RecordType extends DripTableRecordTypeWithSubtable<DripTableRecordTypeBase, ExtractDripTableExtraOption<ExtraOptions, 'SubtableDataSourceKey'>>,
  ExtraOptions extends Partial<DripTableExtraOptions> = never,
> {
  column: DripTableBuiltInColumnSchema;
  schema: DripTableProps<RecordType, ExtraOptions>['schema'];
  record: RecordType;
  rowIndex: number;
  customComponents: DripTableProps<RecordType, ExtraOptions>['components'];
  ext?: DripTableGeneratorProps<RecordType, ExtraOptions>['ext'];
  icons?: DripTableGeneratorProps<RecordType, ExtraOptions>['icons'];
  preview?: DripTableGeneratorProps<RecordType, ExtraOptions>['preview'];
  onEvent?: DripTableGeneratorProps<RecordType, ExtraOptions>['onEvent'];
  createEvaluator?: DripTableGeneratorProps<RecordType, ExtraOptions>['createEvaluator'];
  defaultComponentLib?: DripTableGeneratorProps<RecordType, ExtraOptions>['defaultComponentLib'];
  schemaFunctionPreprocessor?: DripTableGeneratorProps<RecordType, ExtraOptions>['schemaFunctionPreprocessor'];
}

const generatorComponentSchema = <T extends DripTableBuiltInColumnSchema | null>(column: T): T => (
  column
    ? {
      ...column,
      options: {
        ...filterAttributes(column.options, 'visibleFunc'),
      },
    }
    : column
);

function CommonCell<
  RecordType extends DripTableRecordTypeWithSubtable<DripTableRecordTypeBase, ExtractDripTableExtraOption<ExtraOptions, 'SubtableDataSourceKey'>>,
  ExtraOptions extends Partial<DripTableExtraOptions> = never,
>(props: CommonCellProps<RecordType, ExtraOptions>) {
  if (props.column?.component === 'group' || props.column?.component === 'popover') {
    return null;
  }

  const columnSchema = generatorComponentSchema(props.column);
  const renderCommonCell = columnSchema
    ? columnRenderGenerator<RecordType, ExtraOptions>(
      {
        uuid: 'DRIP-TABLE-GENERATOR-INSTANCE',
        schema: props.schema,
        dataSource: [props.record],
      },
      columnSchema,
      {
        components: props.customComponents,
        ext: props.ext,
        unknownComponent: <Alert type="error" message="未知组件" />,
        preview: props.preview !== false,
        icons: props.icons,
        defaultComponentLib: props.defaultComponentLib,
        onEvent: props.preview === false ? props.onEvent : void 0,
        createEvaluator: props.createEvaluator ?? createEvaluator,
        evaluate,
        safeEvaluate,
        finalizeString,
        schemaFunctionPreprocessor: props.schemaFunctionPreprocessor,
      },
    )
    : () => <div />;
  return (
    <React.Fragment>
      {renderCommonCell(null, { type: 'body', key: '$$KEY$$', record: props.record, index: props.rowIndex }, props.rowIndex)}
    </React.Fragment>
  );
}

export default CommonCell;
