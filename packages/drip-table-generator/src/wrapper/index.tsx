/**
 * This file is part of the drip-table project.
 * @link     : https://drip-table.jd.com/
 * @author   : helloqian12138 (johnhello12138@163.com)
 * @modifier : helloqian12138 (johnhello12138@163.com)
 * @copyright: Copyright (c) 2020 JD Network Technology Co., Ltd.
 */

import { message } from 'antd';
import ConfigProvider from 'antd/es/config-provider';
import zhCN from 'antd/es/locale/zh_CN';
import { DripTableExtraOptions, DripTableRecordTypeBase, DripTableRecordTypeWithSubtable, ExtractDripTableExtraOption } from 'drip-table';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import { DripTableGeneratorContext, DripTableGeneratorStates, GeneratorContext } from '@/context';
import { DTGTableConfig, DTGTableConfigsContext, TableConfigsContext } from '@/context/table-configs';
import GeneratorLayout from '@/layouts';
import { generateTableConfigsBySchema, getSchemaValue } from '@/layouts/utils';

import { DripTableGeneratorProps } from '../typing';

export type GeneratorWrapperHandler = {
  getState: () => void;
  getSchemaValue: () => void;
  getDataSource: () => void;
  getTableConfigs: () => DTGTableConfig[];
  setter: {
    updateTableConfig: DTGTableConfigsContext['updateTableConfig'];
    updateTableConfigs: DTGTableConfigsContext['updateTableConfigs'];
    setTableConfigs: DTGTableConfigsContext['setTableConfigs'];
    setTableColumns: DTGTableConfigsContext['setTableColumns'];
  };
}

const generateStates = <
  RecordType extends DripTableRecordTypeWithSubtable<DripTableRecordTypeBase, ExtractDripTableExtraOption<ExtraOptions, 'SubtableDataSourceKey'>>,
  ExtraOptions extends Partial<DripTableExtraOptions> = never,
>(props: DripTableGeneratorProps<RecordType, ExtraOptions>): DripTableGeneratorStates => {
  const { checkedTableId, checkedColumnId } = props;
  return {
    currentTableID: checkedTableId,
    currentColumnID: checkedColumnId,
    previewDataSource: [...props.dataSource || []],
    mode: props.defaultMode ?? 'edit',
  };
};

const DripTableGenerator = React.forwardRef(<
  RecordType extends DripTableRecordTypeWithSubtable<DripTableRecordTypeBase, ExtractDripTableExtraOption<ExtraOptions, 'SubtableDataSourceKey'>>,
  ExtraOptions extends Partial<DripTableExtraOptions> = never,
>(props: DripTableGeneratorProps<RecordType, ExtraOptions>, ref: React.ForwardedRef<GeneratorWrapperHandler>) => {
  const [generatorStates, setGeneratorStates] = React.useState(generateStates(props));
  const [tableConfigs, setDripTableConfigs] = React.useState(generateTableConfigsBySchema(props.schema));

  const tableConfigsContext: DTGTableConfigsContext = React.useMemo(() => ({
    tableConfigs,
    updateTableConfig(config, index, callback) {
      const newTableConfigs = [...tableConfigs];
      if (index >= tableConfigs.length) {
        newTableConfigs.push(cloneDeep(config));
      } else {
        newTableConfigs[index] = cloneDeep(config);
      }
      setDripTableConfigs(newTableConfigs);
      callback?.(newTableConfigs);
    },
    updateTableConfigs(configs, callback) {
      const newTableConfigs = cloneDeep([...configs]);
      setDripTableConfigs(newTableConfigs);
      callback?.(newTableConfigs);
    },
    setTableConfigs(config, index, callback) {
      const newTableConfigs = [...tableConfigs];
      newTableConfigs[index] = {
        ...newTableConfigs[index],
        configs: config,
      };
      setDripTableConfigs(newTableConfigs);
      callback?.(newTableConfigs);
    },
    setTableColumns(columns, index, callback) {
      const newTableConfigs = [...tableConfigs];
      newTableConfigs[index] = {
        ...newTableConfigs[index],
        columns,
      };
      setDripTableConfigs(newTableConfigs);
      callback?.(newTableConfigs);
    },
  }), [
    tableConfigs,
    setDripTableConfigs,
  ]);

  const dripTableGeneratorContext: DripTableGeneratorContext = React.useMemo(() => ({
    ...generatorStates,
    setState(states, callback) {
      if (!states) { return; }
      const newStates = { ...generatorStates };
      Object.keys(states).forEach((key) => {
        newStates[key] = cloneDeep(states[key]);
      });
      setGeneratorStates(newStates);
      callback?.(newStates);
    },
  }), [
    generatorStates,
    cloneDeep,
    setGeneratorStates,
  ]);

  React.useImperativeHandle(ref, () => ({
    getState: () => generatorStates,
    getTableConfigs: () => tableConfigs,
    getSchemaValue: () => getSchemaValue(tableConfigs),
    getDataSource: () => generatorStates.previewDataSource,
    setter: {
      updateTableConfig: tableConfigsContext.updateTableConfig,
      updateTableConfigs: tableConfigsContext.updateTableConfigs,
      setTableConfigs: tableConfigsContext.setTableConfigs,
      setTableColumns: tableConfigsContext.setTableColumns,
    },
    checkColumn: (tableId: string, columnId: string) => {
      setGeneratorStates({ ...generatorStates, currentTableID: tableId, currentColumnID: columnId });
    },
  }));

  React.useEffect(() => {
    props.onSchemaChange?.(getSchemaValue(tableConfigs));
  }, [tableConfigs]);

  React.useEffect(() => {
    if (!props.dataSource) { return; }
    if (Array.isArray(props.dataSource)) {
      setGeneratorStates({
        ...generatorStates,
        previewDataSource: props.dataSource,
      });
    }
  }, [props.dataSource]);

  message.config({ maxCount: 1 });

  return (
    <ConfigProvider locale={zhCN}>
      <GeneratorContext.Provider value={dripTableGeneratorContext}>
        <TableConfigsContext.Provider value={tableConfigsContext}>
          <GeneratorLayout {...props} />
        </TableConfigsContext.Provider>
      </GeneratorContext.Provider>
    </ConfigProvider>
  );
}) as <
  RecordType extends DripTableRecordTypeWithSubtable<DripTableRecordTypeBase, ExtractDripTableExtraOption<ExtraOptions, 'SubtableDataSourceKey'>>,
  ExtraOptions extends Partial<DripTableExtraOptions> = never,
> (props: React.PropsWithoutRef<DripTableGeneratorProps<RecordType, ExtraOptions>> & React.RefAttributes<GeneratorWrapperHandler>) => (React.ReactElement | null);

export default DripTableGenerator;
