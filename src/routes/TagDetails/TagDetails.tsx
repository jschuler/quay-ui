import {
  Breadcrumb,
  BreadcrumbItem,
  Page,
  PageSection,
  PageSectionVariants,
  Title,
  PageBreadcrumb,
} from '@patternfly/react-core';
import {useSearchParams, useLocation} from 'react-router-dom';
import {useState, useEffect} from 'react';
import TagArchSelect from './TagDetailsArchSelect';
import TagTabs from './TagDetailsTabs';
import {
  TagsResponse,
  getTags,
  getManifestByDigest,
  Tag,
  ManifestByDigestResponse,
  Manifest,
} from 'src/resources/TagResource';
import {addDisplayError, isErrorString} from 'src/resources/ErrorHandling';
import {QuayBreadcrumb} from 'src/components/breadcrumb/Breadcrumb';
import ErrorBoundary from 'src/components/errors/ErrorBoundary';
import RequestError from 'src/components/errors/RequestError';

export default function TagDetails() {
  const [searchParams] = useSearchParams();
  const [architecture, setArchitecture] = useState<string>();
  const [err, setErr] = useState<string>();
  const [tagDetails, setTagDetails] = useState<Tag>({
    name: '',
    is_manifest_list: false,
    last_modified: '',
    manifest_digest: '',
    reversion: false,
    size: 0,
    start_ts: 0,
    manifest_list: {
      schemaVersion: 0,
      mediaType: '',
      manifests: [],
    },
  });

  // TODO: refactor, need more checks when parsing path
  const location = useLocation();
  const [org, ...repoPath] = location.pathname.split('/').slice(2);
  const tag = repoPath.pop();
  const repo = repoPath.join('/');

  useEffect(() => {
    (async () => {
      try {
        const resp: TagsResponse = await getTags(org, repo, 1, 100, tag);

        // These should never happen but checking for errors just in case
        if (resp.tags.length === 0) {
          throw new Error('Could not find tag');
        }
        if (resp.tags.length > 1) {
          throw new Error(
            'Unexpected response from API: more than one tag returned',
          );
        }

        const tagResp: Tag = resp.tags[0];
        const archs: string[] = [];
        if (tagResp.is_manifest_list) {
          const manifestResp: ManifestByDigestResponse =
            await getManifestByDigest(org, repo, tagResp.manifest_digest);
          tagResp.manifest_list = JSON.parse(manifestResp.manifest_data);
          for (const manifest of tagResp.manifest_list.manifests) {
            archs.push(manifest.platform.architecture);
          }
        }

        setTagDetails(tagResp);
        if (archs.length > 0) {
          setArchitecture(
            searchParams.get('arch') ? searchParams.get('arch') : archs[0],
          );
        }
      } catch (error: any) {
        console.error(error);
        setErr(addDisplayError('Unable to get details for tag', error));
      }
    })();
  }, []);

  // Pull size and digest from manifest otherwise default to pull from tagDetails
  let size: number = tagDetails.size;
  let digest: string = tagDetails.manifest_digest;
  if (architecture) {
    const manifest: Manifest = tagDetails.manifest_list?.manifests.filter(
      (manifest: Manifest) => manifest.platform.architecture === architecture,
    )[0];
    size = manifest.size;
    digest = manifest.digest;
  }

  return (
    <Page>
      <QuayBreadcrumb />
      <PageSection variant={PageSectionVariants.light}>
        <Title headingLevel="h1">{tag}</Title>
        <TagArchSelect
          arch={architecture}
          options={tagDetails.manifest_list?.manifests.map(
            (manifest: Manifest) => manifest.platform.architecture,
          )}
          setArch={setArchitecture}
          render={tagDetails.is_manifest_list}
        />
        <ErrorBoundary
          hasError={isErrorString(err)}
          fallback={<RequestError message={err} />}
        >
          <TagTabs
            org={org}
            repo={repo}
            tag={tagDetails}
            size={size}
            digest={digest}
            err={err}
          />
        </ErrorBoundary>
      </PageSection>
    </Page>
  );
}
